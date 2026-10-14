import { prisma } from "./db";

// Dev mock: OTP_MODE=mock logs code to console. Prod: plug MSG91/Twilio here.
export async function sendOtp(phone: string): Promise<string> {
  const code = (process.env.OTP_MODE ?? "mock") === "mock"
    ? "123456"
    : Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.otpCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });
  if ((process.env.OTP_MODE ?? "mock") === "mock") {
    console.log(`[OTP mock] ${phone} -> ${code}`);
  } else {
    // TODO: integrate MSG91/Twilio/Exotel send here
    console.log(`[OTP prod] send ${code} to ${phone}`);
  }
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const latest = await prisma.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return false;
  if (latest.expiresAt < new Date()) return false;
  if (latest.code !== code) {
    await prisma.otpCode.update({ where: { id: latest.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await prisma.otpCode.deleteMany({ where: { phone } });
  return true;
}
