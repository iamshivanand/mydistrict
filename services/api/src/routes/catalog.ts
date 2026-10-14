import { Router } from "express";
import { prisma } from "../utils/db";
import { CreateCategorySchema, CreateServiceSchema, CreateDistrictSchema, CreatePincodeSchema } from "@mydistrict/shared-types";
import { validate } from "../middleware/validate";
import { requireAdmin } from "../middleware/auth";

const r = Router();

// Public reads
r.get("/districts", async (_req, res) => {
  res.json({ districts: await prisma.district.findMany({ where: { active: true }, include: { pincodes: true } }) });
});
r.get("/categories", async (_req, res) => {
  res.json({ categories: await prisma.serviceCategory.findMany({ where: { active: true }, include: { services: { where: { active: true } } } }) });
});
r.get("/services", async (req, res) => {
  const { categoryId, q } = req.query as { categoryId?: string; q?: string };
  res.json({
    services: await prisma.service.findMany({
      where: {
        active: true,
        ...(categoryId ? { categoryId } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { category: true },
      take: 100,
    }),
  });
});

// Admin writes
r.post("/categories", ...requireAdmin, validate(CreateCategorySchema), async (req, res) => {
  const created = await prisma.serviceCategory.create({ data: req.body });
  res.status(201).json({ category: created });
});
r.post("/services", ...requireAdmin, validate(CreateServiceSchema), async (req, res) => {
  const created = await prisma.service.create({ data: { ...req.body, createdById: (req as unknown as { userId: string }).userId } });
  res.status(201).json({ service: created });
});
r.patch("/services/:id", ...requireAdmin, async (req, res) => {
  const updated = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
  res.json({ service: updated });
});
r.post("/districts", ...requireAdmin, validate(CreateDistrictSchema), async (req, res) => {
  res.status(201).json({ district: await prisma.district.create({ data: req.body }) });
});
r.post("/pincodes", ...requireAdmin, validate(CreatePincodeSchema), async (req, res) => {
  res.status(201).json({ pincode: await prisma.pincode.create({ data: req.body }) });
});

export default r;
