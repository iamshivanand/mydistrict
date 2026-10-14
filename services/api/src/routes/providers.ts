import { Router } from "express";
import { prisma } from "../utils/db";
import { OnboardProviderSchema } from "@mydistrict/shared-types";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { kycUpload, publicFileUrl } from "../middleware/upload";

const r = Router();

// Public provider discovery (APPROVED only)
r.get("/", async (req, res) => {
  const { serviceId, districtId, pincode, minRating, q } = req.query as Record<string, string | undefined>;
  const providers = await prisma.providerProfile.findMany({
    where: {
      verificationStatus: "APPROVED",
      ...(districtId ? { districtId } : {}),
      ...(pincode ? { pincodeCode: pincode } : {}),
      ...(minRating ? { avgRating: { gte: Number(minRating) } } : {}),
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
      ...(serviceId ? { services: { some: { serviceId, active: true } } } : {}),
    },
    include: {
      district: true,
      services: { where: { active: true }, include: { service: { include: { category: true } } } },
      user: { select: { id: true, name: true, phone: false } },
    },
    take: 50,
    orderBy: [{ avgRating: "desc" }, { totalReviews: "desc" }],
  });
  res.json({ providers });
});

r.get("/:id", async (req, res) => {
  const p = await prisma.providerProfile.findUnique({
    where: { id: req.params.id },
    include: {
      district: true,
      services: { include: { service: { include: { category: true } } } },
    },
  });
  if (!p || p.verificationStatus !== "APPROVED") return res.status(404).json({ error: "Provider not found" });
  const reviews = await prisma.review.findMany({
    where: { providerId: p.userId }, orderBy: { createdAt: "desc" }, take: 20,
  });
  // Hide location unless provider opted in
  const safe = p.showLocation ? p : { ...p, lat: null, lng: null };
  res.json({ provider: safe, reviews });
});

// Onboard / update own provider profile (multipart docs)
r.post(
  "/onboard",
  requireAuth,
  kycUpload.fields([
    { name: "idFront", maxCount: 1 }, { name: "idBack", maxCount: 1 },
    { name: "addressProof", maxCount: 1 }, { name: "selfie", maxCount: 1 },
    { name: "certificates", maxCount: 4 },
  ]),
  async (req: AuthRequest, res) => {
    const parsed = OnboardProviderSchema.safeParse({
      ...req.body,
      lat: req.body.lat ? Number(req.body.lat) : undefined,
      lng: req.body.lng ? Number(req.body.lng) : undefined,
      showLocation: req.body.showLocation === "true" || req.body.showLocation === true,
      serviceIds: Array.isArray(req.body.serviceIds) ? req.body.serviceIds : req.body.serviceIds ? [req.body.serviceIds] : [],
      consentAccepted: req.body.consentAccepted === "true" || req.body.consentAccepted === true,
    });
    if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    const d = parsed.data;
    const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const first = (k?: Express.Multer.File[]) => (k?.[0] ? publicFileUrl(k[0].filename) : undefined);

    const district = await prisma.district.findUnique({ where: { id: d.districtId } });
    if (!district) return res.status(400).json({ error: "Invalid district" });
    const pin = await prisma.pincode.findUnique({ where: { code: d.pincode } });

    const existing = await prisma.providerProfile.findUnique({ where: { userId: req.userId! } });
    // Validate requested services exist
    const services = await prisma.service.findMany({ where: { id: { in: d.serviceIds }, active: true }, include: { category: true } });
    if (services.length !== d.serviceIds.length) return res.status(400).json({ error: "One or more services invalid" });
    for (const s of services) {
      if (s.category.requiresCertificate && !(files.certificates?.length)) {
        return res.status(400).json({ error: `Certificate required for ${s.name}` });
      }
    }

    const data = {
      displayName: d.displayName, bio: d.bio, addressLine: d.addressLine,
      pincodeId: pin?.id, pincodeCode: d.pincode, districtId: d.districtId,
      lat: d.lat, lng: d.lng, showLocation: d.showLocation,
      idType: d.idType, idNumber: d.idNumber, bankUpiId: d.bankUpiId,
      ...(first(files.idFront) ? { idFrontUrl: first(files.idFront) } : {}),
      ...(first(files.idBack) ? { idBackUrl: first(files.idBack) } : {}),
      ...(first(files.addressProof) ? { addressProofUrl: first(files.addressProof) } : {}),
      ...(first(files.selfie) ? { selfieUrl: first(files.selfie) } : {}),
      ...(files.certificates?.length ? { certificateUrls: files.certificates.map((f) => publicFileUrl(f.filename)) } : {}),
      verificationStatus: "PENDING" as const, rejectionReason: null,
    };

    const profile = existing
      ? await prisma.providerProfile.update({ where: { userId: req.userId! }, data })
      : await prisma.providerProfile.create({ data: { ...data, userId: req.userId! } });

    // Upsert provider services with default price = service basePrice
    for (const s of services) {
      await prisma.providerService.upsert({
        where: { providerId_serviceId: { providerId: profile.id, serviceId: s.id } },
        update: { active: true },
        create: { providerId: profile.id, serviceId: s.id, price: s.basePrice },
      });
    }
    await prisma.user.update({ where: { id: req.userId! }, data: { role: "PROVIDER" } });
    res.status(201).json({ profile, message: "Submitted for admin review" });
  }
);

r.get("/me/status", requireAuth, async (req: AuthRequest, res) => {
  const p = await prisma.providerProfile.findUnique({ where: { userId: req.userId! } });
  res.json({ profile: p });
});

r.put("/me/pricing", requireAuth, async (req: AuthRequest, res) => {
  const { items } = req.body as { items: { serviceId: string; price: number; active?: boolean }[] };
  const profile = await prisma.providerProfile.findUnique({ where: { userId: req.userId! } });
  if (!profile) return res.status(404).json({ error: "No provider profile" });
  for (const it of items ?? []) {
    await prisma.providerService.updateMany({
      where: { providerId: profile.id, serviceId: it.serviceId },
      data: { price: it.price, ...(it.active !== undefined ? { active: it.active } : {}) },
    });
  }
  res.json({ ok: true });
});

export default r;
