import jwt from "jsonwebtoken";

const ACCESS = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me-32chars-min";
const REFRESH = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me-32chars-min";
const ADMIN = process.env.JWT_ADMIN_SECRET ?? "dev-admin-secret-change-me-32chars-min";

export interface TokenPayload { sub: string; phone: string; role: string; kind: "access" | "refresh" | "admin"; }

export function signAccess(p: Omit<TokenPayload, "kind">) {
  return jwt.sign({ ...p, kind: "access" }, ACCESS, { expiresIn: "15m" });
}
export function signRefresh(p: Omit<TokenPayload, "kind">) {
  return jwt.sign({ ...p, kind: "refresh" }, REFRESH, { expiresIn: "30d" });
}
export function signAdmin(p: Omit<TokenPayload, "kind">) {
  return jwt.sign({ ...p, kind: "admin" }, ADMIN, { expiresIn: "8h" });
}
export function verifyAccess(t: string): TokenPayload { return jwt.verify(t, ACCESS) as TokenPayload; }
export function verifyRefresh(t: string): TokenPayload { return jwt.verify(t, REFRESH) as TokenPayload; }
export function verifyAdmin(t: string): TokenPayload { return jwt.verify(t, ADMIN) as TokenPayload; }
