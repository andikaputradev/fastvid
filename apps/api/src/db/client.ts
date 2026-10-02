import { createDbClient, type DbClient } from "@vidsaveid/db";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

let cachedDbClient: DbClient | undefined;

export function getDbClient(): DbClient {
  if (cachedDbClient !== undefined) {
    return cachedDbClient;
  }

  if (env.DATABASE_URL === undefined || env.DATABASE_URL.trim().length === 0) {
    throw new AppError("DATABASE_UNAVAILABLE", "Database access is unavailable.", 503);
  }

  cachedDbClient = createDbClient(env.DATABASE_URL);
  return cachedDbClient;
}
