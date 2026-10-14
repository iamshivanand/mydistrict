import { Router } from "express";
import { SendOtpSchema, VerifyOtpSchema } from "@mydistrict/shared-types";
import { validate } from "../middleware/validate";
import { prisma } from "../utils/db";
import { sendOtp, verifyOtp } from "../utils/otp";
import { signAccess, signAdmin, signRefresh, verifyRefresh } from "../utils/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";

const r = Router();

r.post("/send-otp", validate(SendOtpSchema), async (req, res) => {
  const { phone } = req.body as { phone: string };
  await sendOtp(phone);
  res.json({ ok: true, mockHint: (process.env.OTP_MODE ?? "mock") === "mock" ? "Use 123456" : undefined });
});

r.post("/verify-otp", validate(VerifyOtpSchema), async (req, res) => {
  const { phone, otp, name } = req.body as { phone: string; otp: string; name?: string };
  const ok = await verifyOtp(phone, otp);
  if (!ok) return res.status(400).json({ error: "Invalid or expired OTP" });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({ data: { phone, phoneVerified: true, name: name ?? null } });
  } else if (!user.phoneVerified) {
    user = await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true, ...(name ? { name } : {}) } });
  }
  if (user.status === "BLOCKED") return res.status(403).json({ error: "ACCOUNT_BLOCKED" });

  // Admins get a separate admin token for the admin portal
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    const adminToken = signAdmin({ sub: user.id, phone: user.phone, role: user.role });
    return res.json({ user, adminToken, accessToken: signAccess({ sub: user.id, phone: user.phone, role: user.role }), refreshToken: signRefresh({ sub: user.id, phone: user.phone, role: user.role }) });
  }
  res.json({
    user,
    accessToken: signAccess({ sub: user.id, phone: user.phone, role: user.role }),
    refreshToken: signRefresh({ sub: user.id, phone: user.phone, role: user.role }),
  });
});

r.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return res.status(400).json({ error: "Missing refreshToken" });
  try {
    const p = verifyRefresh(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: p.sub } });
    if (!user || user.status === "BLOCKED") return res.status(401).json({ error: "Invalid session" });
    res.json({ accessToken: signAccess({ sub: user.id, phone: user.phone, role: user.role }) });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

r.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { providerProfile: { include: { district: true, services: { include: { service: true } } } } },
  });
  res.json({ user });
});

export default r;
