import { Server as SocketIOServer, Socket } from "socket.io";
import { SystemRole } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { setSocketIOInstance } from "../services/socketService";

export function setupSocketGateway(io: SocketIOServer) {
  setSocketIOInstance(io);

  // Handshake authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication token required for WebSocket connection"));
      }

      let payload;
      try {
        payload = verifyToken(token);
      } catch (err) {
        return next(new Error("Invalid or expired session token"));
      }

      // Check user in database and verify active state
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        return next(new Error("Account inactive or user does not exist"));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      console.error("Socket authentication error:", err);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    console.log(`[Socket.IO] Authenticated user connected: ${user.name} (${user.email}, socket: ${socket.id})`);

    // Auto-join private user room for personal notifications
    socket.join(`user:${user.id}`);

    // Join project room with membership validation
    const handleProjectJoin = async (data: any, callback?: (res: any) => void) => {
      try {
        const projectId = typeof data === "string" ? data : data?.projectId;
        if (!projectId) {
          return callback?.({ success: false, error: "Missing projectId" });
        }

        // Verify user has access to this project
        const isSystemAdmin = user.systemRole === SystemRole.ADMIN;
        let hasAccess = isSystemAdmin;

        if (!hasAccess) {
          const membership = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: { projectId, userId: user.id },
            },
          });
          hasAccess = !!membership;
        }

        if (!hasAccess) {
          console.warn(`[Socket.IO] Access denied for user ${user.id} to project room: ${projectId}`);
          return callback?.({
            success: false,
            error: "Forbidden: You are not a member of this project",
          });
        }

        socket.join(`project:${projectId}`);
        console.log(`[Socket.IO] Socket ${socket.id} (${user.email}) joined room project:${projectId}`);
        callback?.({ success: true, room: `project:${projectId}` });
      } catch (error) {
        console.error("Error joining project room:", error);
        callback?.({ success: false, error: "Failed to join project room" });
      }
    };

    socket.on("project:join", handleProjectJoin);
    socket.on("join:project", handleProjectJoin);

    // Leave project room (supports both project:leave and leave:project)
    const handleProjectLeave = (data: any) => {
      const projectId = typeof data === "string" ? data : data?.projectId;
      if (projectId) {
        socket.leave(`project:${projectId}`);
        console.log(`[Socket.IO] Socket ${socket.id} left room project:${projectId}`);
      }
    };

    socket.on("project:leave", handleProjectLeave);
    socket.on("leave:project", handleProjectLeave);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${user.email} (${reason})`);
    });
  });
}
