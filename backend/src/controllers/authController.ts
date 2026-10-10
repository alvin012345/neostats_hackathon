import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { signToken } from "../utils/jwt";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "ACCOUNT_DEACTIVATED",
        message: "Account deactivated",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      systemRole: user.systemRole,
    });

    const { passwordHash: _, ...safeUser } = user;

    return res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login controller error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Login failed" });
  }
}

export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const { passwordHash: _, ...safeUser } = req.user;
  return res.status(200).json({ user: safeUser });
}
