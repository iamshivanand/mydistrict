import { Router } from "express";
import { prisma } from "../utils/db";
import { requireAdmin } from "../middleware/auth";
import { AuthRequest } from "../middleware/auth";
import { ReviewProviderSchema, BlockUserSchema } from "@mydistrict/shared-types";
import { validate } from "../middleware/validate";

const r = Router();
r.use(...requireAdmin);

async function audit(actorId: string, action: string, targetType: string, targetId: string, metadata?: object) {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, metadata: metadata as never } });
}

// Provider review queue
r.get("/providers/pending", async (_req, res) => {
  const list = await prisma.providerProfile.findMany({
    where: { verificationStatus: "PENDING" },
    include: { user: true, district: true, services: { include: { service: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json({ providers: list });
});

r.get("/providers", async (req, res) => {
  const { status } = req.query as { status?: string };
  res.json({
    providers: await prisma.providerProfile.findMany({
      where: status ? { verificationStatus: status as never } : {},
      include: { user: true, district: true },
      orderBy: { createdAt: "desc" }, take: 100,
    }),
  });
});

r.post("/providers/:id/review", validate(ReviewProviderSchema), async (req: AuthRequest, res) => {
  const { action, reason } = req.body as { action: "APPROVE" | "REJECT" | "SUSPEND"; reason?: string };
  const profile = await prisma.providerProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Not found" });
  const map = { APPROVE: "APPROVED", REJECT: "REJECTED", SUSPEND: "SUSPENDED" } as const;
  const updated = await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { verificationStatus: map[action], rejectionReason: reason ?? null, reviewedById: req.userId!, reviewedAt: new Date() },
  });
  await audit(req.userId!, `PROVIDER_${action}`, "ProviderProfile", profile.id, { reason });
  await prisma.notification.create({
    data: { userId: profile.userId, channel: "IN_APP", title: `KYC ${map[action]}`, body: reason ?? `Your profile was ${map[action]}`, payload: {} },
  });
  res.json({ profile: updated });
});

// Users: list / block / unblock
r.get("/users", async (req, res) => {
  const { q, status, role } = req.query as Record<string, string | undefined>;
  res.json({
    users: await prisma.user.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(role ? { role: role as never } : {}),
        ...(q ? { OR: [{ phone: { contains: q } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" }, take: 100,
    }),
  });
});

r.post("/users/:id/block", validate(BlockUserSchema), async (req: AuthRequest, res) => {
  const { reason } = req.body as { reason: string };
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "BLOCKED", blockedAt: new Date(), blockedReason: reason },
  });
  await audit(req.userId!, "USER_BLOCK", "User", updated.id, { reason });
  res.json({ user: updated });
});

r.post("/users/:id/unblock", async (req: AuthRequest, res) => {
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "ACTIVE", blockedAt: null, blockedReason: null },
  });
  await audit(req.userId!, "USER_UNBLOCK", "User", updated.id, {});
  res.json({ user: updated });
});

// Dashboard + audit
r.get("/dashboard", async (_req, res) => {
  const [users, pending, bookings, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.booking.count(),
    prisma.booking.aggregate({ where: { paymentStatus: { in: ["PAID", "CASH_COLLECTED"] } }, _sum: { priceQuoted: true } }),
  ]);
  res.json({ kpis: { users, pendingProviders: pending, bookings, revenue: revenue._sum.priceQuoted ?? 0 } });
});

r.get("/bookings", async (req, res) => {
  const { status } = req.query as { status?: string };
  res.json({
    bookings: await prisma.booking.findMany({
      where: status ? { status: status as never } : {},
      include: { service: true, consumer: { select: { phone: true, name: true } }, provider: { select: { phone: true, name: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    }),
  });
});

r.get("/audit-logs", async (_req, res) => {
  res.json({ logs: await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) });
});

export default r;
