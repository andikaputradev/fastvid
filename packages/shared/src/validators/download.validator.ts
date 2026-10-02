import { z } from "zod";
import { publicUrlSchema } from "./url.validator.js";

export const downloadRequestSchema = z.object({
  url: publicUrlSchema,
  platformId: z.enum(["instagram", "tiktok", "facebook", "x", "youtube", "threads"]).optional()
});

export type DownloadRequestInput = z.infer<typeof downloadRequestSchema>;
