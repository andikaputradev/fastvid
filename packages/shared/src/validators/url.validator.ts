import { z } from "zod";

export const publicUrlSchema = z
  .string()
  .trim()
  .min(1, "URL wajib diisi.")
  .max(2048, "URL terlalu panjang.")
  .url("Format URL tidak valid.")
  .refine((value) => {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }, "URL harus memakai protokol http atau https.");

export type PublicUrlInput = z.infer<typeof publicUrlSchema>;
