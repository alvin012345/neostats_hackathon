import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { SystemRole } from "@prisma/client";
import { prisma } from "../config/prisma";

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  systemRole: z.nativeEnum(SystemRole).default(SystemRole.USER),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  systemRole: z.nativeEnum(SystemRole).optional(),
  isActive: z.boolean().optional(),
});

export async function getUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch users" });
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { email, name, password, systemRole } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return res.status(409).json({
        error: "EMAIL_EXISTS",
        message: "A user with this email address already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        systemRole: systemRole || SystemRole.USER,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ message: "User created successfully", data: user });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create user" });
  }
}

export async function deactivateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }

    // Safety check: Prevent deactivating the sole active administrator
    if (targetUser.systemRole === SystemRole.ADMIN && targetUser.isActive) {
      const activeAdminCount = await prisma.user.count({
        where: {
          systemRole: SystemRole.ADMIN,
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: "LAST_ADMIN_PROTECTION",
          message: "Cannot deactivate the sole active administrator. Promote another administrator first.",
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !targetUser.isActive },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        systemRole: true,
      },
    });

    return res.status(200).json({
      message: `User ${updatedUser.isActive ? "activated" : "deactivated"} successfully`,
      data: updatedUser,
    });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }
    console.error("Deactivate user error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update user status" });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }

    // Safety check: Prevent deleting the sole active administrator
    if (targetUser.systemRole === SystemRole.ADMIN) {
      const activeAdminCount = await prisma.user.count({
        where: {
          systemRole: SystemRole.ADMIN,
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: "LAST_ADMIN_PROTECTION",
          message: "Cannot delete the sole active administrator. Promote another administrator first.",
        });
      }
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2023") {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }
    console.error("Delete user error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete user" });
  }
}
