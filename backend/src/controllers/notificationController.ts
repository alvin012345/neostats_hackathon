import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function getNotifications(req: Request, res: Response) {
  try {
    const user = req.user!;

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return res.status(200).json({ data: notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch notifications" });
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return res.status(404).json({ error: "NOT_FOUND", message: "Notification not found" });

    if (notification.userId !== user.id) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Cannot modify other users' notifications" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({ message: "Notification marked as read", data: updated });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update notification" });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    const user = req.user!;

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to mark notifications as read" });
  }
}
