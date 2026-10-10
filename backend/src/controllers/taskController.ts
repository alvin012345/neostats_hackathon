import { Request, Response } from "express";
import { z } from "zod";
import { SystemRole, ProjectRole, TaskStatus, TaskPriority } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logActivity, sendNotification } from "../services/activityService";
import { socketService } from "../services/socketService";


export const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters"),
  description: z.string().trim().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters").optional(),
  description: z.string().trim().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  expectedVersion: z.number().int().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  expectedVersion: z.number().int().optional(),
});

// GET /api/projects/:id/tasks
export async function getTasksForProject(req: Request, res: Response) {
  try {
    const { id: projectId } = req.params;
    const { status, priority, assigneeId } = req.query;

    const whereClause: any = { projectId };
    if (status) whereClause.status = status as TaskStatus;
    if (priority) whereClause.priority = priority as TaskPriority;
    if (assigneeId) whereClause.assigneeId = assigneeId as string;

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return res.status(200).json({ data: tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch tasks" });
  }
}

// POST /api/projects/:id/tasks
export async function createTask(req: Request, res: Response) {
  try {
    const { id: projectId } = req.params;
    const { title, description, status, priority, assigneeId, dueDate } = req.body;
    const user = req.user!;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "NOT_FOUND", message: "Project not found" });

    if (project.isArchived) {
      return res.status(403).json({
        error: "PROJECT_ARCHIVED",
        message: "Cannot create tasks in an archived project.",
      });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        status: status || TaskStatus.TODO,
        priority: priority || TaskPriority.MEDIUM,
        version: 1,
        creatorId: user.id,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      userId: user.id,
      projectId,
      action: "task_created",
      entityType: "TASK",
      entityId: task.id,
      metadata: { title: task.title, status: task.status },
    });

    if (task.assigneeId) {
      await logActivity({
        userId: user.id,
        projectId,
        action: "task_assigned",
        entityType: "TASK",
        entityId: task.id,
        metadata: {
          taskTitle: task.title,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee?.name,
        },
      });

      if (task.assigneeId !== user.id) {
        const notif = await sendNotification({
          userId: task.assigneeId,
          title: "New Task Assigned",
          message: `You were assigned to "${task.title}" in ${project.name}`,
          link: `/tasks/${task.id}`,
        });
        if (notif) socketService.emitNotification(task.assigneeId, notif);
      }
    }

    // Broadcast new task to project room
    socketService.emitTaskCreated(projectId, task);

    return res.status(201).json({ message: "Task created successfully", data: task });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create task" });
  }
}

// GET /api/tasks/:id
export async function getTaskById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, isArchived: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!task) return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });

    // Verify membership: System Admin or member of the project
    const user = req.user!;
    if (user.systemRole !== SystemRole.ADMIN) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: user.id } },
      });
      if (!membership) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not have access to tasks in this project.",
        });
      }
    }

    return res.status(200).json({ data: task });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });
    }
    console.error("Get task by ID error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch task" });
  }
}

// PATCH /api/tasks/:id
export async function updateTask(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, dueDate, expectedVersion } = req.body;
    const user = req.user!;

    const currentTask = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!currentTask) return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });

    if (currentTask.project.isArchived) {
      return res.status(403).json({
        error: "PROJECT_ARCHIVED",
        message: "Cannot modify tasks in an archived project.",
      });
    }

    // Role verification: Admins and Project Managers can edit any task;
    // Team Members can only edit tasks assigned to them!
    const isSystemAdmin = user.systemRole === SystemRole.ADMIN;
    let isProjectManager = false;

    if (!isSystemAdmin) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: currentTask.projectId, userId: user.id } },
      });

      if (!membership) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Not a member of this project" });
      }

      if (membership.role === ProjectRole.VIEWER) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Viewers have read-only access" });
      }

      isProjectManager = membership.role === ProjectRole.PROJECT_MANAGER;

      if (!isProjectManager && currentTask.assigneeId !== user.id) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "Team Members can only edit tasks assigned to them.",
        });
      }

      // Team Members cannot assign or reassign tasks
      if (assigneeId !== undefined && assigneeId !== currentTask.assigneeId && !isProjectManager) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "Only Project Managers and Admins can assign or reassign tasks.",
        });
      }
    }

    // OCC Check: If expectedVersion is supplied, enforce version matching
    if (expectedVersion !== undefined) {
      const updateResult = await prisma.task.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        // Concurrency conflict detected!
        const latestTask = await prisma.task.findUnique({
          where: { id },
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } },
          },
        });

        return res.status(409).json({
          error: "CONCURRENCY_CONFLICT",
          message: "Conflict: This task was modified by another user while you were editing.",
          currentTask: latestTask,
        });
      }
    } else {
      // Direct update when client does not supply version (bumps version automatically)
      await prisma.task.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          version: { increment: 1 },
        },
      });
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      userId: user.id,
      projectId: currentTask.projectId,
      action: "task_updated",
      entityType: "TASK",
      entityId: id,
      metadata: { previousVersion: currentTask.version, newVersion: updatedTask?.version },
    });

    // If assignment changed, log task_assigned and notify new assignee
    if (assigneeId !== undefined && assigneeId !== currentTask.assigneeId) {
      if (assigneeId) {
        await logActivity({
          userId: user.id,
          projectId: currentTask.projectId,
          action: "task_assigned",
          entityType: "TASK",
          entityId: id,
          metadata: {
            taskTitle: updatedTask?.title || currentTask.title,
            oldAssigneeId: currentTask.assigneeId,
            newAssigneeId: assigneeId,
            assigneeName: updatedTask?.assignee?.name,
          },
        });

        if (assigneeId !== user.id) {
          const notif = await sendNotification({
            userId: assigneeId,
            title: "Task Assigned",
            message: `You were assigned to "${updatedTask?.title}" in ${currentTask.project.name}`,
            link: `/tasks/${id}`,
          });
          if (notif) socketService.emitNotification(assigneeId, notif);
        }
      }
    }

    // If status changed, log status_changed and notify assignee
    if (status !== undefined && status !== currentTask.status) {
      await logActivity({
        userId: user.id,
        projectId: currentTask.projectId,
        action: "status_changed",
        entityType: "TASK",
        entityId: id,
        metadata: { oldStatus: currentTask.status, newStatus: status, title: updatedTask?.title || currentTask.title },
      });

      if (currentTask.assigneeId && currentTask.assigneeId !== user.id) {
        const notif = await sendNotification({
          userId: currentTask.assigneeId,
          title: "Task Status Updated",
          message: `Task "${currentTask.title}" status changed to ${status}`,
          link: `/tasks/${id}`,
        });
        if (notif) socketService.emitNotification(currentTask.assigneeId, notif);
      }
    }

    // Broadcast updated task to project room
    if (updatedTask) {
      socketService.emitTaskUpdated(currentTask.projectId, updatedTask);
    }

    return res.status(200).json({ message: "Task updated", data: updatedTask });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });
    }
    console.error("Update task error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update task" });
  }
}

// PATCH /api/tasks/:id/status
export async function updateTaskStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, expectedVersion } = req.body;
    const user = req.user!;

    const currentTask = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!currentTask) return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });

    if (currentTask.project.isArchived) {
      return res.status(403).json({
        error: "PROJECT_ARCHIVED",
        message: "Cannot modify tasks in an archived project.",
      });
    }

    // Role check: Admin, PM, or assigned Team Member
    const isSystemAdmin = user.systemRole === SystemRole.ADMIN;
    if (!isSystemAdmin) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: currentTask.projectId, userId: user.id } },
      });

      if (!membership || membership.role === ProjectRole.VIEWER) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Read-only access or not a project member" });
      }

      if (membership.role === ProjectRole.TEAM_MEMBER && currentTask.assigneeId !== user.id) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "Team Members can only change status on tasks assigned to them.",
        });
      }
    }

    // OCC Check
    if (expectedVersion !== undefined) {
      const updateResult = await prisma.task.updateMany({
        where: { id, version: expectedVersion },
        data: {
          status,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        const latestTask = await prisma.task.findUnique({
          where: { id },
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } },
          },
        });

        return res.status(409).json({
          error: "CONCURRENCY_CONFLICT",
          message: "Conflict: This task was modified by another user.",
          currentTask: latestTask,
        });
      }
    } else {
      await prisma.task.update({
        where: { id },
        data: {
          status,
          version: { increment: 1 },
        },
      });
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      userId: user.id,
      projectId: currentTask.projectId,
      action: "status_changed",
      entityType: "TASK",
      entityId: id,
      metadata: { oldStatus: currentTask.status, newStatus: status, title: currentTask.title },
    });

    // Notify assignee if someone else updated status
    if (currentTask.assigneeId && currentTask.assigneeId !== user.id) {
      const notif = await sendNotification({
        userId: currentTask.assigneeId,
        title: "Task Status Updated",
        message: `Task "${currentTask.title}" status changed to ${status}`,
        link: `/tasks/${id}`,
      });
      if (notif) socketService.emitNotification(currentTask.assigneeId, notif);
    }

    // Also notify creator if someone else updated status
    if (currentTask.creatorId !== user.id && currentTask.creatorId !== currentTask.assigneeId) {
      const notif = await sendNotification({
        userId: currentTask.creatorId,
        title: "Task Status Updated",
        message: `Task "${currentTask.title}" status changed to ${status}`,
        link: `/tasks/${id}`,
      });
      if (notif) socketService.emitNotification(currentTask.creatorId, notif);
    }

    // Broadcast status change to project room
    if (updatedTask) {
      socketService.emitTaskStatusChanged(currentTask.projectId, {
        taskId: id,
        status,
        version: updatedTask.version,
        updatedBy: { id: user.id, name: user.name },
      });
    }

    return res.status(200).json({ message: "Status updated", data: updatedTask });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });
    }
    console.error("Update task status error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update task status" });
  }
}

// DELETE /api/tasks/:id
export async function deleteTask(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const currentTask = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!currentTask) return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });

    // Block deletion if project is archived!
    if (currentTask.project.isArchived) {
      return res.status(403).json({
        error: "PROJECT_ARCHIVED",
        message: "Cannot delete tasks in an archived project.",
      });
    }

    // ONLY Admin or Project Manager can delete tasks!
    const isSystemAdmin = user.systemRole === SystemRole.ADMIN;
    if (!isSystemAdmin) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: currentTask.projectId, userId: user.id } },
      });

      if (!membership || membership.role !== ProjectRole.PROJECT_MANAGER) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "Insufficient permissions. Only Project Managers or Admins can delete tasks.",
        });
      }
    }

    await prisma.task.delete({ where: { id } });

    await logActivity({
      userId: user.id,
      projectId: currentTask.projectId,
      action: "TASK_DELETED",
      entityType: "TASK",
      entityId: id,
      metadata: { title: currentTask.title },
    });

    // Broadcast deletion to project room
    socketService.emitTaskDeleted(currentTask.projectId, id);

    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });
    }
    console.error("Delete task error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete task" });
  }
}
