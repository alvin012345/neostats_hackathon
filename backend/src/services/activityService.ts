import { prisma } from "../config/prisma";
import { socketService } from "./socketService";

export async function logActivity(params: {
  userId: string;
  projectId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        userId: params.userId,
        projectId: params.projectId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata || {},
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (activity) {
      socketService.emitActivityLog(params.projectId, activity);
    }

    return activity;
  } catch (error) {
    console.error("Failed to record activity log:", error);
    return null;
  }
}

export async function sendNotification(params: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        link: params.link,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
