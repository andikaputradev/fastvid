import { eq } from "drizzle-orm";
import { blockedDomains, blockedUrlPatterns, type DbClient } from "@vidsaveid/db";
import { isHostnameAllowed } from "@vidsaveid/security";

export interface MatchedBlockedPattern {
  pattern: string;
  patternType: "exact" | "glob" | "regex";
}

export interface BlocklistRepository {
  isDomainBlocked(hostname: string): Promise<boolean>;
  findMatchingBlockedPattern(url: string): Promise<MatchedBlockedPattern | null>;
}

function normalizePatternType(patternType: string): MatchedBlockedPattern["patternType"] {
  if (patternType === "glob" || patternType === "regex") {
    return patternType;
  }

  return "exact";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToRegex(pattern: string): RegExp {
  return new RegExp(`^${escapeRegex(pattern).replaceAll("\\*", ".*")}$`, "u");
}

function isPatternMatch(url: string, pattern: MatchedBlockedPattern): boolean {
  if (pattern.patternType === "exact") {
    return url === pattern.pattern;
  }

  if (pattern.patternType === "glob") {
    return globToRegex(pattern.pattern).test(url);
  }

  try {
    return new RegExp(pattern.pattern, "u").test(url);
  } catch {
    return true;
  }
}

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

export function createBlocklistRepository(db: DbClient): BlocklistRepository {
  return {
    async isDomainBlocked(hostname) {
      return safeQuery(async () => {
        const rows = await db
          .select({
            domain: blockedDomains.domain
          })
          .from(blockedDomains);

        return rows.some((row) => isHostnameAllowed(hostname, [row.domain]));
      }, false);
    },

    async findMatchingBlockedPattern(url) {
      return safeQuery(async () => {
        const rows = await db
          .select({
            pattern: blockedUrlPatterns.pattern,
            patternType: blockedUrlPatterns.patternType
          })
          .from(blockedUrlPatterns)
          .where(eq(blockedUrlPatterns.isActive, true));
        const patterns = rows.map((row) => ({
          pattern: row.pattern,
          patternType: normalizePatternType(row.patternType)
        }));

        return patterns.find((pattern) => isPatternMatch(url, pattern)) ?? null;
      }, null);
    }
  };
}
