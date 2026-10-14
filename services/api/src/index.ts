import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/auth";
import catalogRoutes from "./routes/catalog";
import providerRoutes from "./routes/providers";
import bookingRoutes from "./routes/bookings";
import paymentRoutes from "./routes/payments";
import adminRoutes from "./routes/admin";

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 300 }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "mydistrict-api", time: new Date().toISOString() }));

// Serve KYC uploads (dev). Prod: replace with signed S3 URLs.
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/providers", providerRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Internal error" });
});

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => console.log(`API listening on :${port}`));
