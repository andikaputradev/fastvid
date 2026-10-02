import { drizzle } from "drizzle-orm/postgres-js";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import type { DbClient } from "../client.js";
import {
  adSettings,
  apiProviders,
  rateLimitRules,
  siteSettings,
  socialPlatforms
} from "../schema/index.js";
import * as schema from "../schema/index.js";
import {
  adSettingsSeed,
  rateLimitRulesSeed,
  siteSettingsSeed,
  socialPlatformsSeed
} from "./seed.js";
import { loadDatabaseEnv } from "./loadEnv.js";

const devActivePlatformSlugs = new Set(["tiktok", "instagram"]);

export interface SeedVerificationOptions {
  allowDevActivePlatforms?: boolean;
  allowExistingProviderKeys?: boolean;
}

export interface SeedVerificationFailure {
  check: string;
  message: string;
}

export interface SeedVerificationResult {
  status: "verified";
  checks: number;
  activePlatformSlugs: readonly string[];
}

export class SeedVerificationError extends Error {
  constructor(readonly failures: readonly SeedVerificationFailure[]) {
    super(
      `Seed verification failed: ${failures.map((failure) => `${failure.check}: ${failure.message}`).join("; ")}`
    );
    this.name = "SeedVerificationError";
  }
}

function addMissingFailures(
  failures: SeedVerificationFailure[],
  check: string,
  expectedValues: readonly string[],
  actualValues: ReadonlySet<string>
): void {
  const missingValues = expectedValues.filter((value) => !actualValues.has(value));

  if (missingValues.length > 0) {
    failures.push({
      check,
      message: `Missing required values: ${missingValues.join(", ")}.`
    });
  }
}

function addRateLimitRuleFailures(
  failures: SeedVerificationFailure[],
  rows: Array<typeof rateLimitRules.$inferSelect>
): void {
  for (const expectedRule of rateLimitRulesSeed) {
    const row = rows.find((candidate) => candidate.ruleName === expectedRule.ruleName);

    if (row === undefined) {
      continue;
    }

    if (
      row.scope !== expectedRule.scope ||
      row.platformSlug !== expectedRule.platformSlug ||
      row.maxRequests !== expectedRule.maxRequests ||
      row.windowSeconds !== expectedRule.windowSeconds
    ) {
      failures.push({
        check: "rate_limit_rules_config",
        message: `Rule ${expectedRule.ruleName} does not match the required seed configuration.`
      });
    }
  }
}

function addAdSlotFailures(
  failures: SeedVerificationFailure[],
  rows: Array<typeof adSettings.$inferSelect>
): void {
  for (const expectedSlot of adSettingsSeed) {
    const row = rows.find((candidate) => candidate.slotKey === expectedSlot.slotKey);

    if (row === undefined) {
      continue;
    }

    if (row.isActive || row.adCode !== null) {
      failures.push({
        check: "ad_settings_safe_defaults",
        message: `Ad slot ${expectedSlot.slotKey} must be inactive and must not contain ad code.`
      });
    }
  }
}

function addPlatformStateFailures(
  failures: SeedVerificationFailure[],
  rows: Array<typeof socialPlatforms.$inferSelect>,
  options: SeedVerificationOptions
): readonly string[] {
  const activePlatformSlugs = rows
    .filter((platform) => platform.isActive || platform.status === "active")
    .map((platform) => platform.slug)
    .sort();

  if (options.allowDevActivePlatforms) {
    const unsafeActiveSlugs = activePlatformSlugs.filter(
      (slug) => !devActivePlatformSlugs.has(slug)
    );

    if (unsafeActiveSlugs.length > 0) {
      failures.push({
        check: "dev_platform_state",
        message: `Only local dev platforms may be active: ${unsafeActiveSlugs.join(", ")}.`
      });
    }
  } else if (activePlatformSlugs.length > 0) {
    failures.push({
      check: "platform_state",
      message: `Default seed must leave all platforms inactive: ${activePlatformSlugs.join(", ")}.`
    });
  }

  return activePlatformSlugs;
}

export async function verifySeed(
  db: DbClient,
  options: SeedVerificationOptions = {}
): Promise<SeedVerificationResult> {
  const failures: SeedVerificationFailure[] = [];
  const settingsRows = await db.select().from(siteSettings);
  const platformRows = await db.select().from(socialPlatforms);
  const adRows = await db.select().from(adSettings);
  const rateLimitRows = await db.select().from(rateLimitRules);
  const providerRows = await db.select().from(apiProviders);

  addMissingFailures(
    failures,
    "site_settings",
    siteSettingsSeed.map((setting) => setting.key),
    new Set(settingsRows.map((setting) => setting.key))
  );
  addMissingFailures(
    failures,
    "social_platforms",
    socialPlatformsSeed.map((platform) => platform.slug),
    new Set(platformRows.map((platform) => platform.slug))
  );
  addMissingFailures(
    failures,
    "ad_settings",
    adSettingsSeed.map((adSlot) => adSlot.slotKey),
    new Set(adRows.map((adSlot) => adSlot.slotKey))
  );
  addMissingFailures(
    failures,
    "rate_limit_rules",
    rateLimitRulesSeed.map((rule) => rule.ruleName),
    new Set(rateLimitRows.map((rule) => rule.ruleName))
  );
  addRateLimitRuleFailures(failures, rateLimitRows);
  addAdSlotFailures(failures, adRows);
  const activePlatformSlugs = addPlatformStateFailures(failures, platformRows, options);
  const providersWithKeys = providerRows.filter((provider) => provider.apiKeyEncrypted !== null);

  if (!options.allowExistingProviderKeys && providersWithKeys.length > 0) {
    failures.push({
      check: "api_provider_keys",
      message: "Seed verification expects no API provider key material in the seeded database."
    });
  }

  if (failures.length > 0) {
    throw new SeedVerificationError(failures);
  }

  return {
    status: "verified",
    checks: 6,
    activePlatformSlugs
  };
}

export async function verifySeedFromDatabaseUrl(
  databaseUrl: string,
  options: SeedVerificationOptions = {}
): Promise<SeedVerificationResult> {
  const client = postgres(databaseUrl, {
    prepare: false
  });
  const db = drizzle(client, {
    schema
  });

  try {
    return await verifySeed(db, options);
  } finally {
    await client.end();
  }
}

async function runVerifyFromEnv(): Promise<void> {
  loadDatabaseEnv();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to verify database seed.");
  }

  const result = await verifySeedFromDatabaseUrl(databaseUrl, {
    allowDevActivePlatforms: process.argv.includes("--allow-dev-active"),
    allowExistingProviderKeys: process.argv.includes("--allow-existing-keys")
  });
  console.info(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runVerifyFromEnv().catch((error: unknown) => {
    if (error instanceof SeedVerificationError) {
      console.error({
        status: "failed",
        failures: error.failures
      });
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  });
}
