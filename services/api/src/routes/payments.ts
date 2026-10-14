import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../utils/db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const r = Router();

// Create Razorpay order for a booking (ONLINE). Stub-friendly: works without keys in dev.
r.post("/razorpay/order", requireAuth, async (req: AuthRequest, res) => {
  const { bookingId } = req.body as { bookingId: string };
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.consumerId !== req.userId) return res.status(404).json({ error: "Booking not found" });
  if (booking.paymentMode !== "ONLINE") return res.status(400).json({ error: "Booking is OFFLINE" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    // Dev stub order
    const fakeId = `order_mock_${booking.id.slice(0, 8)}`;
    await prisma.booking.update({ where: { id: booking.id }, data: { razorpayOrderId: fakeId } });
    return res.json({ orderId: fakeId, amount: booking.priceQuoted * 100, currency: "INR", mock: true });
  }
  const Razorpay = (await import("razorpay")).default;
  const rz = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = await rz.orders.create({ amount: booking.priceQuoted * 100, currency: "INR", receipt: booking.id });
  await prisma.booking.update({ where: { id: booking.id }, data: { razorpayOrderId: order.id } });
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
});

// Verify payment signature from client, or webhook marks PAID
r.post("/razorpay/verify", requireAuth, async (req: AuthRequest, res) => {
  const { bookingId, razorpay_payment_id, razorpay_signature } = req.body as Record<string, string>;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "mock";
  const expected = crypto.createHmac("sha256", secret).update(`${booking.razorpayOrderId}|${razorpay_payment_id}`).digest("hex");
  const isMock = (booking.razorpayOrderId ?? "").startsWith("order_mock_");
  if (!isMock && expected !== razorpay_signature) {
    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: "FAILED" } });
    return res.status(400).json({ error: "Signature mismatch" });
  }
  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: "PAID" } });
  res.json({ booking: updated });
});

r.post("/razorpay/webhook", async (req, res) => {
  // TODO: verify webhook secret, handle payment.captured / refunds
  res.json({ ok: true });
});

export default r;
