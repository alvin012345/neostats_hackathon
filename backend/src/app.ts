import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import projectRoutes from "./routes/projectRoutes";
import taskRoutes from "./routes/taskRoutes";
import commentRoutes from "./routes/commentRoutes";
import notificationRoutes from "./routes/notificationRoutes";

export function createApp(): Application {
  const app = express();

  const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "neostats-collaborative-api",
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/comments", commentRoutes);
  app.use("/api/notifications", notificationRoutes);

  // 404 Route Not Found Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled API Error:", err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected server error occurred",
    });
  });

  return app;
}
