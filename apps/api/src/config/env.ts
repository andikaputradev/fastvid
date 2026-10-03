import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z
    .string()
    .refine(
      (val) => {
        const origins = val.split(",").map((s) => s.trim()).filter(Boolean);
        return (
          origins.length > 0 &&
          origins.every((origin) => {
            try {
              new URL(origin);
              return true;
            } catch {
              return false;
            }
          })
        );
      },
      { message: "WEB_ORIGIN must contain valid URL(s) separated by commas" }
    )
    .default("http://localhost:5173"),
  DATABASE_URL: z.string().optional(),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  IP_HASH_SECRET: z.string().min(32),
  API_KEY_ENCRYPTION_KEY: z
    .string()
    .refine((value) => Buffer.from(value, "base64").byteLength === 32, {
      message: "API_KEY_ENCRYPTION_KEY must decode to 32 bytes"
    }),
  ADMIN_SESSION_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().optional()
});

export const env = envSchema.parse({
  ...process.env,
  API_PORT: process.env.API_PORT ?? process.env.PORT
});

export type Env = typeof env;
