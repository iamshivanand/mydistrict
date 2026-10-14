import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema, src: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[src]);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    (req as unknown as Record<string, unknown>)[src] = parsed.data;
    next();
  };
