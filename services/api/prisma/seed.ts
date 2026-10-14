import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function seed() {
  const district = await prisma.district.upsert({
    where: { slug: "demo-district" },
    update: {},
    create: { name: "Demo District", state: "Demo State", slug: "demo-district" },
  });
  await prisma.pincode.upsert({
    where: { code: "123456" },
    update: {},
    create: { code: "123456", districtId: district.id },
  });
  const plumbing = await prisma.serviceCategory.upsert({
    where: { slug: "home-services" },
    update: {},
    create: { name: "Home Services", slug: "home-services", icon: "wrench" },
  });
  const beauty = await prisma.serviceCategory.upsert({
    where: { slug: "beauty" },
    update: {},
    create: { name: "Beauty & Salon", slug: "beauty", icon: "sparkles", requiresLocation: true },
  });
  await prisma.service.upsert({
    where: { id: "seed-plumber" },
    update: {},
    create: { id: "seed-plumber", name: "Plumber on Visit", categoryId: plumbing.id, basePrice: 299, unit: "visit" },
  }).catch(async () => {
    const existing = await prisma.service.findFirst({ where: { name: "Plumber on Visit" } });
    if (!existing) await prisma.service.create({ name: "Plumber on Visit", categoryId: plumbing.id, basePrice: 299 });
  });
  await prisma.service.upsert({
    where: { id: "seed-facial" },
    update: {},
    create: { id: "seed-facial", name: "Salon Facial", categoryId: beauty.id, basePrice: 799, unit: "session" },
  }).catch(async () => {
    const existing = await prisma.service.findFirst({ where: { name: "Salon Facial" } });
    if (!existing) await prisma.service.create({ name: "Salon Facial", categoryId: beauty.id, basePrice: 799 });
  });
  const adminPhone = "9999999999";
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { role: "SUPER_ADMIN", phoneVerified: true },
    create: { phone: adminPhone, name: "Super Admin", role: "SUPER_ADMIN", phoneVerified: true },
  });
  console.log("Seed done:", district.slug);
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
