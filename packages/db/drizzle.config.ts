import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  const envPath = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", "..", ".env")].find(existsSync);

  if (envPath) {
    loadEnvFile(envPath);
  }
}

const databaseUrl = process.env.DATABASE_URL?.trim();

export default defineConfig({
  dialect: "postgresql",
  schema: "./dist/schema/*.schema.js",
  out: "./src/migrations",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true,
  verbose: true
});
