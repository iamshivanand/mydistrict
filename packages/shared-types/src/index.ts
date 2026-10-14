import { z } from "zod";

// ---- Enums (mirror Prisma) ----
export const RoleSchema = z.enum(["CONSUMER", "PROVIDER", "ADMIN", "SUPER_ADMIN"]);
export const UserStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]);
export const VerificationStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);
export const BookingStatusSchema = z.enum(["REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export const PaymentModeSchema = z.enum(["ONLINE", "OFFLINE"]);
export const PaymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "CASH_DUE", "CASH_COLLECTED"]);
export const IdTypeSchema = z.enum(["AADHAAR", "PAN", "DL", "VOTER", "OTHER"]);

// ---- Auth ----
export const SendOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit Indian mobile number"),
});
export const VerifyOtpSchema = z.object({
  phone: SendOtpSchema.shape.phone,
  otp: z.string().length(6),
  name: z.string().min(2).max(80).optional(),
});

// ---- Catalog ----
export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  icon: z.string().max(80).optional(),
  requiresLocation: z.boolean().default(false),
  requiresCertificate: z.boolean().default(false),
});
export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(100),
  categoryId: z.string().cuid(),
  description: z.string().max(2000).optional(),
  basePrice: z.number().int().min(0),
  unit: z.string().max(30).default("visit"),
});
export const CreateDistrictSchema = z.object({
  name: z.string().min(2),
  state: z.string().min(2),
  slug: z.string().min(2),
});
export const CreatePincodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  districtId: z.string().cuid(),
});

// ---- Provider onboarding ----
export const OnboardProviderSchema = z.object({
  displayName: z.string().min(2).max(100),
  bio: z.string().max(1000).optional(),
  addressLine: z.string().min(5).max(300),
  pincode: z.string().regex(/^\d{6}$/),
  districtId: z.string().cuid(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  showLocation: z.boolean().default(false),
  idType: IdTypeSchema,
  idNumber: z.string().min(4).max(30).optional(),
  bankUpiId: z.string().max(100).optional(),
  serviceIds: z.array(z.string().cuid()).min(1, "Pick at least one service"),
  consentAccepted: z.literal(true, { errorMap: () => ({ message: "Consent required" }) }),
});

// ---- Booking ----
export const CreateBookingSchema = z.object({
  providerId: z.string().cuid(),
  serviceId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  addressText: z.string().min(5).max(300),
  lat: z.number().optional(),
  lng: z.number().optional(),
  paymentMode: PaymentModeSchema,
});
export const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// ---- Admin ----
export const ReviewProviderSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SUSPEND"]),
  reason: z.string().max(500).optional(),
});
export const BlockUserSchema = z.object({
  reason: z.string().min(3).max(500),
});

export type Role = z.infer<typeof RoleSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
