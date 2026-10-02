import { eq } from "drizzle-orm";
import { adSettings, siteSettings, type DbClient } from "@vidsaveid/db";
import type { PublicAdSlot, PublicCustomAd } from "@vidsaveid/shared";

export interface PublicSettings {
  siteName: string;
  siteTitle: string;
  tagline: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  status: string;
}

export interface SettingsRepository {
  getPublicSettings(): Promise<PublicSettings>;
  getSettingByKey(key: string): Promise<string | null>;
  getMaintenanceStatus(): Promise<{
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    status: string;
  }>;
  getActiveAds(): Promise<PublicAdSlot[]>;
}

function parseBoolean(value: string | null): boolean {
  return value === "true" || value === "1";
}

function settingMap(rows: Array<{ key: string; value: string }>): Map<string, string> {
  return new Map(rows.map((setting) => [setting.key, setting.value]));
}

function publicSettingsFromMap(settings: Map<string, string>): PublicSettings {
  const maintenanceMode = parseBoolean(settings.get("maintenance_mode") ?? null);

  return {
    siteName: settings.get("site_name") ?? "VidSaveID",
    siteTitle: settings.get("site_title") ?? "VidSaveID",
    tagline: settings.get("tagline") ?? "Download public social videos safely.",
    maintenanceMode,
    maintenanceMessage: maintenanceMode ? (settings.get("maintenance_message") ?? "Service is under maintenance.") : null,
    status: settings.get("site_status") ?? (maintenanceMode ? "maintenance" : "ok")
  };
}

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

export function createSettingsRepository(db: DbClient): SettingsRepository {
  return {
    async getPublicSettings() {
      return safeQuery(async () => {
        const rows = await db
          .select({
            key: siteSettings.key,
            value: siteSettings.value
          })
          .from(siteSettings)
          .where(eq(siteSettings.isPublic, true));
        return publicSettingsFromMap(settingMap(rows));
      }, defaultPublicSettings());
    },

    async getSettingByKey(key) {
      return safeQuery(async () => {
        const rows = await db
          .select({
            value: siteSettings.value
          })
          .from(siteSettings)
          .where(eq(siteSettings.key, key))
          .limit(1);
        return rows[0]?.value ?? null;
      }, null);
    },

    async getMaintenanceStatus() {
      const publicSettings = await safeQuery(async () => {
        const keys = ["maintenance_mode", "maintenance_message", "site_status"];
        const entries = await Promise.all(keys.map(async (key) => [key, await this.getSettingByKey(key)] as const));
        const settings = new Map(entries.filter((entry): entry is readonly [string, string] => entry[1] !== null));
        return publicSettingsFromMap(settings);
      }, defaultPublicSettings());

      return {
        maintenanceMode: publicSettings.maintenanceMode,
        maintenanceMessage: publicSettings.maintenanceMessage,
        status: publicSettings.status
      };
    },

    async getActiveAds() {
      return safeQuery(async () => {
        const rows = await db
          .select({
            slotKey: adSettings.slotKey,
            providerName: adSettings.providerName,
            adCode: adSettings.adCode
          })
          .from(adSettings)
          .where(eq(adSettings.isActive, true));

        return rows.map((row): PublicAdSlot => {
          let customAd: PublicCustomAd | null = null;
          let adType: "code" | "custom" = "code";

          if (row.adCode && row.adCode.startsWith('{"type":"custom"')) {
            try {
              const parsed = JSON.parse(row.adCode) as Record<string, unknown>;
              if (
                parsed &&
                parsed.type === "custom" &&
                typeof parsed.imageUrl === "string" &&
                typeof parsed.targetUrl === "string"
              ) {
                customAd = {
                  imageUrl: parsed.imageUrl,
                  targetUrl: parsed.targetUrl,
                  altText: typeof parsed.altText === "string" ? parsed.altText : ""
                };
                adType = "custom";
              }
            } catch {
              adType = "code";
            }
          }

          return {
            slotKey: row.slotKey,
            providerName: row.providerName,
            adType,
            adCode: adType === "code" ? row.adCode : null,
            customAd
          };
        });
      }, []);
    }
  };
}

function defaultPublicSettings(): PublicSettings {
  return {
    siteName: "VidSaveID",
    siteTitle: "VidSaveID",
    tagline: "Download public social videos safely.",
    maintenanceMode: false,
    maintenanceMessage: null,
    status: "ok"
  };
}
