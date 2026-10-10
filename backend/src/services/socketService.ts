import { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function setSocketIOInstance(io: SocketIOServer) {
  ioInstance = io;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export const socketService = {
  // Broadcast task creation to project room
  emitTaskCreated(projectId: string, task: any) {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("task:created", task);
  },

  // Broadcast task detail update to project room
  emitTaskUpdated(projectId: string, task: any) {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("task:updated", task);
  },

  // Broadcast task status update to project room
  emitTaskStatusChanged(projectId: string, payload: { taskId: string; status: string; version: number; updatedBy: any }) {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("task:status_changed", payload);
  },

  // Broadcast task deletion to project room
  emitTaskDeleted(projectId: string, taskId: string) {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("task:deleted", { taskId });
  },

  // Broadcast new comment to project room
  emitCommentCreated(projectId: string, comment: any) {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("comment:created", comment);
  },

  // Broadcast comment deletion to project room
  emitCommentDeleted(projectId: string, data: { commentId: string; taskId: string }) {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("comment:deleted", data);
  },

  // Broadcast activity log to project room
  emitActivityLog(projectId: string, activity: any) {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("activity:created", activity);
    ioInstance.to(`project:${projectId}`).emit("activity_created", activity);
  },

  // Broadcast member roster changes to project room
  emitMemberUpdated(projectId: string, member: any, action: "ADDED" | "ROLE_CHANGED" | "REMOVED") {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit("member:updated", { member, action });
  },

  // Dispatch private notification to specific user room
  emitNotification(userId: string, notification: any) {
    if (!ioInstance) return;
    ioInstance.to(`user:${userId}`).emit("notification:new", notification);
  },

  // Live room eviction: Kick user's connected sockets from project room
  evictUserFromProject(userId: string, projectId: string) {
    if (!ioInstance) return;
    ioInstance.in(`user:${userId}`).socketsLeave(`project:${projectId}`);
    ioInstance.to(`user:${userId}`).emit("member:removed_from_project", { projectId });
  },
};
