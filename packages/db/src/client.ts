import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type DbClient = PostgresJsDatabase<typeof schema>;

export function createDbClient(databaseUrl: string): DbClient {
  const normalizedUrl = databaseUrl.trim();

  if (normalizedUrl.length === 0) {
    throw new Error("DATABASE_URL is required to create a database client.");
  }

  const client = postgres(normalizedUrl, {
    prepare: false
  });

  return drizzle(client, {
    schema
  });
}
