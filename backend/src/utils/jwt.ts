import jwt from "jsonwebtoken";
import { SystemRole } from "@prisma/client";

export interface TokenPayload {
  userId: string;
  email: string;
  systemRole: SystemRole;
}

const JWT_SECRET = process.env.JWT_SECRET || "supersecret_jwt_key_neostats_hackathon_2026";
const JWT_EXPIRES_IN = "8h";

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
