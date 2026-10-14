import multer from "multer";
import path from "path";
import fs from "fs";

const dir = path.join(process.cwd(), "uploads", "kyc");
fs.mkdirSync(dir, { recursive: true });

export const kycUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (/^(image|application)\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only images/PDF allowed"));
  },
});

export function publicFileUrl(filename: string) {
  return `/uploads/kyc/${filename}`;
}
