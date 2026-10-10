import { Request, Response } from "express";
import { z } from "zod";
import { SystemRole, ProjectRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logActivity, sendNotification } from "../services/activityService";
import { socketService } from "../services/socketService";


export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment content cannot be empty"),
});

// GET /api/tasks/:id/comments
export async function getCommentsForTask(req: Request, res: Response) {
  try {
    const { id: taskId } = req.params;
    const user = req.user!;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });

    if (!task) return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });

    if (user.systemRole !== SystemRole.ADMIN) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: user.id } },
      });
      if (!membership) {
        return res.status(403).json({ error: "FORBIDDEN", message: "You do not have access to this project." });
      }
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({ data: comments });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });
    }
    console.error("Get comments error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch comments" });
  }
}

// POST /api/tasks/:id/comments
export async function createComment(req: Request, res: Response) {
  try {
    const { id: taskId } = req.params;
    const { content } = req.body;
    const user = req.user!;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });

    if (task.project.isArchived) {
      return res.status(403).json({
        error: "PROJECT_ARCHIVED",
        message: "Cannot comment on tasks in an archived project.",
      });
    }

    // Role check: Admin, PM, or Team Member (Viewer is read-only!)
    if (user.systemRole !== SystemRole.ADMIN) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: user.id } },
      });

      if (!membership) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Not a member of this project" });
      }

      if (membership.role === ProjectRole.VIEWER) {
        return res.status(403).json({ error: "FORBIDDEN", message: "Viewers have read-only access and cannot post comments" });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: user.id,
        content,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      userId: user.id,
      projectId: task.projectId,
      action: "comment_added",
      entityType: "COMMENT",
      entityId: comment.id,
      metadata: { taskId, taskTitle: task.title },
    });

    // Notify task assignee if someone else commented
    if (task.assigneeId && task.assigneeId !== user.id) {
      const notif = await sendNotification({
        userId: task.assigneeId,
        title: "New Comment on Task",
        message: `${user.name} commented on "${task.title}"`,
        link: `/tasks/${taskId}`,
      });
      if (notif) socketService.emitNotification(task.assigneeId, notif);
    }

    // Check for @mentions in comment content
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId: task.projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const mentionedUserIds = new Set<string>();
    for (const member of projectMembers) {
      if (member.userId === user.id || member.userId === task.assigneeId) continue;
      const namePart = member.user.name.split(" ")[0].toLowerCase();
      const fullName = member.user.name.toLowerCase();
      const emailPrefix = member.user.email.split("@")[0].toLowerCase();
      const contentLower = content.toLowerCase();

      if (
        contentLower.includes(`@${fullName}`) ||
        contentLower.includes(`@${namePart}`) ||
        contentLower.includes(`@${emailPrefix}`)
      ) {
        mentionedUserIds.add(member.userId);
      }
    }

    for (const mentionedId of Array.from(mentionedUserIds)) {
      const mentionNotif = await sendNotification({
        userId: mentionedId,
        title: "Mentioned in Comment",
        message: `${user.name} mentioned you on "${task.title}": "${content.slice(0, 60)}"`,
        link: `/tasks/${taskId}`,
      });
      if (mentionNotif) socketService.emitNotification(mentionedId, mentionNotif);
    }

    // Broadcast new comment to project room
    socketService.emitCommentCreated(task.projectId, comment);

    return res.status(201).json({ message: "Comment posted", data: comment });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Task not found" });
    }
    console.error("Create comment error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create comment" });
  }
}

// DELETE /api/comments/:id
export async function deleteComment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { task: { include: { project: true } } },
    });

    if (!comment) return res.status(404).json({ error: "NOT_FOUND", message: "Comment not found" });

    // Block deletion if project is archived
    if (comment.task.project.isArchived) {
      return res.status(403).json({
        error: "PROJECT_ARCHIVED",
        message: "Cannot delete comments in an archived project.",
      });
    }

    // Permitted: comment author, PM on the project, or System Admin
    const isAuthor = comment.userId === user.id;
    const isSystemAdmin = user.systemRole === SystemRole.ADMIN;
    let isPM = false;

    if (!isAuthor && !isSystemAdmin) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: comment.task.projectId, userId: user.id } },
      });
      isPM = membership?.role === ProjectRole.PROJECT_MANAGER;
    }

    if (!isAuthor && !isSystemAdmin && !isPM) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You can only delete your own comments unless you are a Project Manager or Admin.",
      });
    }

    await prisma.comment.delete({ where: { id } });

    // Broadcast comment deletion to project room
    socketService.emitCommentDeleted(comment.task.projectId, { commentId: id, taskId: comment.taskId });

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Comment not found" });
    }
    console.error("Delete comment error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete comment" });
  }
}
