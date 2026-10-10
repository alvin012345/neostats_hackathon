import { Request, Response } from "express";
import { z } from "zod";
import { SystemRole, ProjectRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logActivity, sendNotification } from "../services/activityService";
import { socketService } from "../services/socketService";


export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters"),
  description: z.string().trim().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters").optional(),
  description: z.string().trim().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.TEAM_MEMBER),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export async function getProjects(req: Request, res: Response) {
  try {
    const user = req.user!;

    let projects;
    if (user.systemRole === SystemRole.ADMIN) {
      projects = await prisma.project.findMany({
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { tasks: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          members: { some: { userId: user.id } },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { tasks: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return res.status(200).json({ data: projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch projects" });
  }
}

export async function getProjectById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, isActive: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Project not found" });
    }

    return res.status(200).json({ data: project });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Project not found" });
    }
    console.error("Get project by ID error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch project" });
  }
}

export async function createProject(req: Request, res: Response) {
  try {
    const { name, description } = req.body;
    const user = req.user!;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: ProjectRole.PROJECT_MANAGER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    await logActivity({
      userId: user.id,
      projectId: project.id,
      action: "project_created",
      entityType: "PROJECT",
      entityId: project.id,
      metadata: { name: project.name },
    });

    return res.status(201).json({ message: "Project created successfully", data: project });
  } catch (error) {
    console.error("Create project error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create project" });
  }
}

export async function updateProject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: "NOT_FOUND", message: "Project not found" });

    if (project.isArchived) {
      return res.status(403).json({
        error: "PROJECT_ARCHIVED",
        message: "Project is archived and read-only. Unarchive it before making updates.",
      });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { name, description },
    });

    await logActivity({
      userId: req.user!.id,
      projectId: id,
      action: "PROJECT_UPDATED",
      entityType: "PROJECT",
      entityId: id,
      metadata: { changes: req.body },
    });

    return res.status(200).json({ message: "Project updated", data: updated });
  } catch (error) {
    console.error("Update project error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update project" });
  }
}

export async function toggleArchiveProject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { isArchived } = req.body || {};

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: "NOT_FOUND", message: "Project not found" });

    const newArchived = isArchived !== undefined ? Boolean(isArchived) : !project.isArchived;

    const updated = await prisma.project.update({
      where: { id },
      data: { isArchived: newArchived },
    });

    await logActivity({
      userId: req.user!.id,
      projectId: id,
      action: updated.isArchived ? "PROJECT_ARCHIVED" : "PROJECT_UNARCHIVED",
      entityType: "PROJECT",
      entityId: id,
      metadata: { isArchived: updated.isArchived },
    });

    return res.status(200).json({
      message: `Project ${updated.isArchived ? "archived" : "unarchived"} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("Archive project error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to archive project" });
  }
}

export async function deleteProject(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: "NOT_FOUND", message: "Project not found" });

    await prisma.project.delete({ where: { id } });

    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete project" });
  }
}

export async function getProjectMembers(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({ data: members });
  } catch (error) {
    console.error("Get members error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch members" });
  }
}

export async function addProjectMember(req: Request, res: Response) {
  try {
    const { id: projectId } = req.params;
    const { userId, role } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (existing) {
      return res.status(409).json({ error: "ALREADY_MEMBER", message: "User is already a member of this project" });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role: role || ProjectRole.TEAM_MEMBER,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const targetProject = await prisma.project.findUnique({ where: { id: projectId } });

    await logActivity({
      userId: req.user!.id,
      projectId,
      action: "member_added",
      entityType: "MEMBER",
      entityId: userId,
      metadata: { userName: targetUser.name, role: member.role },
    });

    // Notify new member and broadcast roster update to project room
    socketService.emitMemberUpdated(projectId, member, "ADDED");
    const notif = await sendNotification({
      userId,
      title: "Added to Project",
      message: `You were added as ${member.role} to project "${targetProject?.name || "Workspace"}"`,
      link: `/projects/${projectId}`,
    });
    if (notif) socketService.emitNotification(userId, notif);

    return res.status(201).json({ message: "Member added successfully", data: member });
  } catch (error) {
    console.error("Add member error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to add member" });
  }
}

export async function updateProjectMemberRole(req: Request, res: Response) {
  try {
    const { id: projectId, userId } = req.params;
    const { role } = req.body;

    const targetProject = await prisma.project.findUnique({ where: { id: projectId } });
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Member not found in project" });
    }

    const updated = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      userId: req.user!.id,
      projectId,
      action: "member_role_changed",
      entityType: "MEMBER",
      entityId: userId,
      metadata: { previousRole: member.role, newRole: role },
    });

    // Broadcast role update to project room
    socketService.emitMemberUpdated(projectId, updated, "ROLE_CHANGED");

    // Send real-time notification to member about role update
    const roleNotif = await sendNotification({
      userId,
      title: "Project Role Updated",
      message: `Your role in project "${targetProject?.name || "Workspace"}" was updated to ${role}`,
      link: `/projects/${projectId}`,
    });
    if (roleNotif) socketService.emitNotification(userId, roleNotif);

    return res.status(200).json({ message: "Member role updated", data: updated });
  } catch (error) {
    console.error("Update member role error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update member role" });
  }
}

export async function removeProjectMember(req: Request, res: Response) {
  try {
    const { id: projectId, userId } = req.params;

    const targetProject = await prisma.project.findUnique({ where: { id: projectId } });
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Member not found in project" });
    }

    // Execute atomic transaction:
    // 1. Remove membership
    // 2. Unassign tasks assigned to this user and increment version!
    await prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({
        where: { projectId_userId: { projectId, userId } },
      });

      await tx.task.updateMany({
        where: { projectId, assigneeId: userId },
        data: {
          assigneeId: null,
          version: { increment: 1 },
        },
      });
    });

    await logActivity({
      userId: req.user!.id,
      projectId,
      action: "member_removed",
      entityType: "MEMBER",
      entityId: userId,
      metadata: { userId },
    });

    // Live Socket Security: Evict member's sockets from project room & broadcast roster change
    socketService.evictUserFromProject(userId, projectId);
    socketService.emitMemberUpdated(projectId, { userId }, "REMOVED");

    // Send notification to removed user
    const removeNotif = await sendNotification({
      userId,
      title: "Removed from Project",
      message: `You were removed from project "${targetProject?.name || "Workspace"}"`,
      link: `/projects`,
    });
    if (removeNotif) socketService.emitNotification(userId, removeNotif);

    return res.status(200).json({ message: "Member removed and assigned tasks unassigned" });
  } catch (error) {
    console.error("Remove member error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to remove member" });
  }
}

export async function getProjectActivity(req: Request, res: Response) {
  try {
    const { id: projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { projectId } }),
    ]);

    return res.status(200).json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get project activity error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch activity logs" });
  }
}
