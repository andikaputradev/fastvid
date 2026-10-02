import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

export function loadDatabaseEnv(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  const candidatePaths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", "..", ".env"),
    resolve(import.meta.dirname ?? "", "../../../.env"),
    resolve(import.meta.dirname ?? "", "../../.env")
  ];

  for (const envPath of candidatePaths) {
    if (envPath && existsSync(envPath)) {
      try {
        loadEnvFile(envPath);
        if (process.env.DATABASE_URL) {
          break;
        }
      } catch {
        // Continue searching fallback paths
      }
    }
  }
}
