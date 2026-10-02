import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import type { DbClient } from "../client.js";
import { socialPlatforms } from "../schema/index.js";
import * as schema from "../schema/index.js";
import { seed, type SeedResult } from "./seed.js";
import { verifySeed } from "./verify.js";
import { loadDatabaseEnv } from "./loadEnv.js";

const localDevPlatformSlugs = ["tiktok", "instagram"] as const;

export interface DevSeedResult extends Omit<SeedResult, "status"> {
  activatedPlatforms: typeof localDevPlatformSlugs;
  status: "seeded-dev";
}

export async function seedDev(db: DbClient): Promise<DevSeedResult> {
  const baseResult = await seed(db);
  await db
    .update(socialPlatforms)
    .set({
      isActive: true,
      status: "active",
      updatedAt: new Date()
    })
    .where(inArray(socialPlatforms.slug, [...localDevPlatformSlugs]));

  await verifySeed(db, {
    allowDevActivePlatforms: true,
    allowExistingProviderKeys: true
  });

  return {
    adSettings: baseResult.adSettings,
    rateLimitRules: baseResult.rateLimitRules,
    siteSettings: baseResult.siteSettings,
    socialPlatforms: baseResult.socialPlatforms,
    activatedPlatforms: localDevPlatformSlugs,
    status: "seeded-dev"
  };
}

export async function seedDevFromDatabaseUrl(databaseUrl: string): Promise<DevSeedResult> {
  const client = postgres(databaseUrl, {
    prepare: false
  });
  const db = drizzle(client, {
    schema
  });

  try {
    return await seedDev(db);
  } finally {
    await client.end();
  }
}

async function runDevSeedFromEnv(): Promise<void> {
  loadDatabaseEnv();
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "db:seed:dev is local/development only and refuses to run with NODE_ENV=production."
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run development database seed.");
  }

  const result = await seedDevFromDatabaseUrl(databaseUrl);
  console.info(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDevSeedFromEnv().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
