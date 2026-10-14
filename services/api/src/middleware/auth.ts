import { Request, Response, NextFunction } from "express";
import { verifyAccess, verifyAdmin } from "../utils/jwt";
import { prisma } from "../utils/db";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  isAdminToken?: boolean;
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    let payload;
    try { payload = verifyAccess(token); }
    catch { payload = verifyAdmin(token); (req as AuthRequest).isAdminToken = true; }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.status === "BLOCKED") return res.status(403).json({ error: "ACCOUNT_BLOCKED" });
    if (user.status === "SUSPENDED") return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export const requireAdmin = [requireAuth, requireRole("ADMIN", "SUPER_ADMIN")];
