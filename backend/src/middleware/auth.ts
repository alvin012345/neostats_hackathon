import { Request, Response, NextFunction } from "express";
import { SystemRole, ProjectRole } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authorization token required (Bearer <token>)",
      });
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: err.name === "TokenExpiredError" ? "Token has expired" : "Invalid token",
      });
    }

    // Verify user in database on EVERY request to ensure active status
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({
        error: "USER_NOT_FOUND",
        message: "Authenticated user no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "ACCOUNT_DEACTIVATED",
        message: "Account deactivated",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to authenticate request" });
  }
}

export function requireSystemRole(requiredRole: SystemRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
    }

    if (req.user.systemRole !== requiredRole) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `Requires ${requiredRole} system privileges.`,
      });
    }

    next();
  };
}

export function requireProjectRole(allowedRoles: ProjectRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
      }

      // System Admin has blanket access to all projects
      if (req.user.systemRole === SystemRole.ADMIN) {
        req.projectRole = ProjectRole.PROJECT_MANAGER;
        return next();
      }

      // Resolve projectId from params or query or task
      let projectId = req.params.projectId;

      // If route is /api/tasks/:id or under tasks router, resolve projectId from task
      if (!projectId && req.baseUrl.includes("tasks") && req.params.id) {
        try {
          const task = await prisma.task.findUnique({
            where: { id: req.params.id },
            select: { projectId: true },
          });
          if (task) projectId = task.projectId;
        } catch {
          // Ignore invalid UUID errors here; will be caught below
        }
      }

      if (!projectId) {
        projectId = req.params.id;
      }

      if (!projectId) {
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "Unable to identify project context for authorization",
        });
      }

      // Look up membership
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You are not a member of this project.",
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: `Insufficient project permissions. Required role: ${allowedRoles.join(" or ")} (Your role: ${membership.role}).`,
        });
      }

      req.projectRole = membership.role;
      next();
    } catch (error) {
      console.error("Project role check error:", error);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to verify project permissions" });
    }
  };
}
