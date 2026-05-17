import jwt from "jsonwebtoken";

import type { IUserRole } from "../types/customer.type.js";

interface JwtPayload {
  id: number;
  email: string;
  role: IUserRole;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}
