import { Router } from "express";
import { prisma } from "../utils/db";
import { CreateBookingSchema, ReviewSchema } from "@mydistrict/shared-types";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const r = Router();
const otp6 = () => Math.floor(100000 + Math.random() * 900000).toString();

// Consumer creates booking
r.post("/", requireAuth, validate(CreateBookingSchema), async (req: AuthRequest, res) => {
  const b = req.body as { providerId: string; serviceId: string; scheduledAt: string; addressText: string; lat?: number; lng?: number; paymentMode: "ONLINE" | "OFFLINE" };
  const providerUser = await prisma.user.findUnique({ where: { id: b.providerId }, include: { providerProfile: true } });
  if (!providerUser?.providerProfile || providerUser.providerProfile.verificationStatus !== "APPROVED")
    return res.status(400).json({ error: "Provider not available" });
  if (providerUser.status !== "ACTIVE") return res.status(400).json({ error: "Provider blocked" });
  const ps = await prisma.providerService.findUnique({
    where: { providerId_serviceId: { providerId: providerUser.providerProfile.id, serviceId: b.serviceId } },
  });
  if (!ps?.active) return res.status(400).json({ error: "Service not offered by provider" });

  const booking = await prisma.booking.create({
    data: {
      consumerId: req.userId!,
      providerId: b.providerId,
      serviceId: b.serviceId,
      districtId: providerUser.providerProfile.districtId,
      scheduledAt: new Date(b.scheduledAt),
      addressText: b.addressText,
      lat: b.lat, lng: b.lng,
      paymentMode: b.paymentMode,
      paymentStatus: b.paymentMode === "OFFLINE" ? "CASH_DUE" : "PENDING",
      priceQuoted: ps.price,
      completionOtp: otp6(),
    },
  });
  await prisma.notification.create({
    data: { userId: b.providerId, channel: "IN_APP", title: "New booking", body: `New booking ${booking.id}`, payload: { bookingId: booking.id } },
  });
  res.status(201).json({ booking });
});

r.get("/mine", requireAuth, async (req: AuthRequest, res) => {
  const role = req.query.as === "provider" ? "provider" : "consumer";
  const bookings = await prisma.booking.findMany({
    where: role === "provider" ? { providerId: req.userId! } : { consumerId: req.userId! },
    include: { service: true, consumer: { select: { id: true, name: true, phone: true } }, provider: { select: { id: true, name: true } }, review: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ bookings });
});

// Provider transitions: confirm -> start -> complete (OTP). Consumer can cancel.
const TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "NO_SHOW"],
};

r.patch("/:id/status", requireAuth, async (req: AuthRequest, res) => {
  const { status, otp, priceFinal } = req.body as { status: string; otp?: string; priceFinal?: number };
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  const isProvider = booking.providerId === req.userId;
  const isConsumer = booking.consumerId === req.userId;
  if (!isProvider && !isConsumer) return res.status(403).json({ error: "Not your booking" });

  if (status === "CANCELLED") {
    if (!["REQUESTED", "CONFIRMED"].includes(booking.status)) return res.status(400).json({ error: "Cannot cancel now" });
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledBy: req.userId, cancelReason: (req.body as { reason?: string }).reason },
    });
    return res.json({ booking: updated });
  }

  if (!isProvider) return res.status(403).json({ error: "Only provider can update progress" });
  const allowed = TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(status)) return res.status(400).json({ error: `Cannot move ${booking.status} -> ${status}` });

  if (status === "COMPLETED") {
    if (otp !== booking.completionOtp) return res.status(400).json({ error: "Wrong completion OTP. Ask consumer." });
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "COMPLETED",
        ...(priceFinal ? { priceFinal } : {}),
        paymentStatus: booking.paymentMode === "OFFLINE" ? "CASH_COLLECTED" : booking.paymentStatus,
      },
    });
    return res.json({ booking: updated });
  }
  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: status as never } });
  res.json({ booking: updated });
});

// Consumer reveals completion OTP (provider asks for it at doorstep)
r.get("/:id/completion-code", requireAuth, async (req: AuthRequest, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking || booking.consumerId !== req.userId) return res.status(404).json({ error: "Not found" });
  res.json({ code: booking.completionOtp });
});

// Review (once per booking, after completion)
r.post("/:id/review", requireAuth, validate(ReviewSchema), async (req: AuthRequest, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { review: true } });
  if (!booking || booking.consumerId !== req.userId) return res.status(404).json({ error: "Not found" });
  if (booking.status !== "COMPLETED") return res.status(400).json({ error: "Can review only after completion" });
  if (booking.review) return res.status(400).json({ error: "Already reviewed" });
  const { rating, comment } = req.body as { rating: number; comment?: string };
  const review = await prisma.review.create({
    data: { bookingId: booking.id, consumerId: req.userId!, providerId: booking.providerId, rating, comment },
  });
  const agg = await prisma.review.aggregate({ where: { providerId: booking.providerId }, _avg: { rating: true }, _count: true });
  const profile = await prisma.providerProfile.findUnique({ where: { userId: booking.providerId } });
  if (profile) {
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { avgRating: agg._avg.rating ?? 0, totalReviews: agg._count },
    });
  }
  res.status(201).json({ review });
});

export default r;
