import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import type { DbClient } from "../client.js";
import {
  adSettings,
  rateLimitRules,
  siteSettings,
  socialPlatforms,
  type NewAdSetting,
  type NewRateLimitRule,
  type NewSiteSetting,
  type NewSocialPlatform
} from "../schema/index.js";
import * as schema from "../schema/index.js";
import { loadDatabaseEnv } from "./loadEnv.js";

export const siteSettingsSeed = [
  {
    key: "site_name",
    value: "FastVid",
    valueType: "string",
    isPublic: true,
    description: "Public site name."
  },
  {
    key: "site_title",
    value: "FastVid - Download Video Sosmed Tanpa Login",
    valueType: "string",
    isPublic: true,
    description: "Default SEO title."
  },
  {
    key: "meta_description",
    value: "Simpan video publik dari berbagai platform dengan cepat, aman, dan praktis.",
    valueType: "string",
    isPublic: true,
    description: "Default SEO meta description."
  },
  {
    key: "tagline",
    value: "Simpan video publik dari berbagai platform dengan cepat, aman, dan praktis.",
    valueType: "string",
    isPublic: true,
    description: "Public site tagline."
  },
  {
    key: "logo_url",
    value: "",
    valueType: "string",
    isPublic: true,
    description: "Public logo asset URL."
  },
  {
    key: "favicon_url",
    value: "",
    valueType: "string",
    isPublic: true,
    description: "Public favicon asset URL."
  },
  {
    key: "site_status",
    value: "active",
    valueType: "string",
    isPublic: true,
    description: "Public site availability status."
  },
  {
    key: "maintenance_mode",
    value: "false",
    valueType: "boolean",
    isPublic: true,
    description: "Public maintenance mode flag."
  },
  {
    key: "maintenance_message",
    value: "Sistem sedang dalam pemeliharaan. Silakan coba beberapa saat lagi.",
    valueType: "string",
    isPublic: true,
    description: "Public maintenance message."
  },
  {
    key: "turnstile_enabled",
    value: "true",
    valueType: "boolean",
    isPublic: false,
    description: "Server-side Turnstile enforcement flag."
  },
  {
    key: "rate_limit_public_per_minute",
    value: "10",
    valueType: "number",
    isPublic: false,
    description: "Default public rate limit per minute."
  }
] satisfies NewSiteSetting[];

export const socialPlatformsSeed = [
  {
    name: "TikTok",
    slug: "tiktok",
    baseDomains: ["tiktok.com", "www.tiktok.com", "vt.tiktok.com", "vm.tiktok.com", "m.tiktok.com"],
    isActive: false,
    status: "inactive"
  },
  {
    name: "Instagram",
    slug: "instagram",
    baseDomains: ["instagram.com", "www.instagram.com"],
    isActive: false,
    status: "inactive"
  },
  {
    name: "Facebook",
    slug: "facebook",
    baseDomains: ["facebook.com", "www.facebook.com", "fb.watch"],
    isActive: false,
    status: "inactive"
  },
  {
    name: "Twitter / X",
    slug: "twitter",
    baseDomains: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"],
    isActive: false,
    status: "inactive"
  },
  {
    name: "Pinterest",
    slug: "pinterest",
    baseDomains: ["pinterest.com", "www.pinterest.com", "pin.it"],
    isActive: false,
    status: "inactive"
  },
  {
    name: "Threads",
    slug: "threads",
    baseDomains: ["threads.net", "www.threads.net"],
    isActive: false,
    status: "inactive"
  },
  {
    name: "SnackVideo",
    slug: "snackvideo",
    baseDomains: ["snackvideo.com", "www.snackvideo.com"],
    isActive: false,
    status: "inactive"
  },
  {
    name: "Likee",
    slug: "likee",
    baseDomains: ["likee.video", "www.likee.video"],
    isActive: false,
    status: "inactive"
  }
] satisfies NewSocialPlatform[];

export const adSettingsSeed = [
  { slotKey: "header", providerName: null, adCode: null, isActive: false },
  { slotKey: "in_content", providerName: null, adCode: null, isActive: false },
  { slotKey: "sidebar", providerName: null, adCode: null, isActive: false },
  { slotKey: "footer", providerName: null, adCode: null, isActive: false },
  { slotKey: "popup", providerName: null, adCode: null, isActive: false }
] satisfies NewAdSetting[];

export const rateLimitRulesSeed = [
  {
    ruleName: "global_public",
    scope: "global",
    platformSlug: null,
    maxRequests: 100,
    windowSeconds: 60,
    isActive: true
  },
  {
    ruleName: "per_ip_default",
    scope: "per_ip",
    platformSlug: null,
    maxRequests: 10,
    windowSeconds: 60,
    isActive: true
  }
] satisfies NewRateLimitRule[];

export interface SeedResult {
  adSettings: number;
  rateLimitRules: number;
  siteSettings: number;
  socialPlatforms: number;
  status: "seeded";
}

export async function seed(db: DbClient): Promise<SeedResult> {
  for (const setting of siteSettingsSeed) {
    await db
      .insert(siteSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value: setting.value,
          valueType: setting.valueType,
          isPublic: setting.isPublic,
          description: setting.description,
          updatedAt: new Date()
        }
      });
  }

  for (const platform of socialPlatformsSeed) {
    await db
      .insert(socialPlatforms)
      .values(platform)
      .onConflictDoUpdate({
        target: socialPlatforms.slug,
        set: {
          name: platform.name,
          baseDomains: platform.baseDomains,
          allowedUrlPatterns: null,
          blockedUrlPatterns: null,
          isActive: false,
          status: "inactive",
          updatedAt: new Date()
        }
      });
  }

  for (const adSlot of adSettingsSeed) {
    await db
      .insert(adSettings)
      .values(adSlot)
      .onConflictDoUpdate({
        target: adSettings.slotKey,
        set: {
          providerName: null,
          adCode: null,
          isActive: false,
          updatedAt: new Date()
        }
      });
  }

  for (const rule of rateLimitRulesSeed) {
    const existingRule = await db.query.rateLimitRules.findFirst({
      where: eq(rateLimitRules.ruleName, rule.ruleName)
    });

    if (existingRule) {
      await db
        .update(rateLimitRules)
        .set({
          scope: rule.scope,
          platformSlug: rule.platformSlug,
          maxRequests: rule.maxRequests,
          windowSeconds: rule.windowSeconds,
          isActive: rule.isActive,
          updatedAt: new Date()
        })
        .where(eq(rateLimitRules.id, existingRule.id));
    } else {
      await db.insert(rateLimitRules).values(rule);
    }
  }

  return {
    adSettings: adSettingsSeed.length,
    rateLimitRules: rateLimitRulesSeed.length,
    siteSettings: siteSettingsSeed.length,
    socialPlatforms: socialPlatformsSeed.length,
    status: "seeded"
  };
}

export async function seedFromDatabaseUrl(databaseUrl: string): Promise<SeedResult> {
  const client = postgres(databaseUrl, {
    prepare: false
  });
  const db = drizzle(client, {
    schema
  });

  try {
    return await seed(db);
  } finally {
    await client.end();
  }
}

async function runSeedFromEnv(): Promise<void> {
  loadDatabaseEnv();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run database seed.");
  }

  const result = await seedFromDatabaseUrl(databaseUrl);
  console.info(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeedFromEnv().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
