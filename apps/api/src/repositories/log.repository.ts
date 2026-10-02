import { requestLogs, type DbClient } from "@vidsaveid/db";

export type RequestLogStatus = "blocked" | "failed" | "maintenance" | "rate_limited" | "success";

export interface CreateRequestLogInput {
  request_id: string;
  platform_slug: string | null;
  provider_slug: string | null;
  url_hash: string;
  ip_hash: string;
  user_agent_hash: string | null;
  status: RequestLogStatus;
  error_code: string | null;
  response_time_ms: number | null;
  country_code: string | null;
}

export interface RequestLogRepository {
  createRequestLog(input: CreateRequestLogInput): Promise<void>;
}

export function createRequestLogRepository(db: DbClient): RequestLogRepository {
  return {
    async createRequestLog(input) {
      await db.insert(requestLogs).values({
        requestId: input.request_id,
        platformSlug: input.platform_slug,
        providerSlug: input.provider_slug,
        urlHash: input.url_hash,
        ipHash: input.ip_hash,
        userAgentHash: input.user_agent_hash,
        status: input.status,
        errorCode: input.error_code,
        responseTimeMs: input.response_time_ms,
        countryCode: input.country_code
      });
    }
  };
}
