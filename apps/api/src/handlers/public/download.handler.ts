import type { FastifyReply, FastifyRequest } from "fastify";
import {
  hashIpAddress,
  hashSubmittedUrl,
  hashUserAgent,
  sanitizeUrl,
  validateNoSsrfTarget,
  type DnsAddress,
  type SecurityResult
} from "@vidsaveid/security";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import { ensurePublicDownloadAvailable } from "../../middleware/maintenanceCheck.js";
import { enforcePublicDownloadRateLimit } from "../../middleware/rateLimiter.js";
import {
  createDefaultRepositories,
  type ApiRepositories
} from "../../repositories/index.js";
import type { PlatformRecord } from "../../repositories/platform.repository.js";
import type { CreateRequestLogInput, RequestLogStatus } from "../../repositories/log.repository.js";
import { defaultProviderAdapter, type ProviderAdapter } from "../../providers/providerAdapter.js";
import { createStreamToken } from "../../services/streamToken.js";

const downloadRequestSchema = z
  .object({
    url: z.string(),
    turnstileToken: z.string().optional()
  })
  .strict();

export interface DownloadHandlerOptions {
  repositories?: ApiRepositories;
  ssrfResolveHostname?: (hostname: string) => Promise<readonly DnsAddress[]>;
  providerAdapter?: ProviderAdapter;
}

interface SafeRequestLogContext {
  requestId: string;
  platformSlug: string | null;
  providerSlug: string | null;
  urlHash: string;
  ipHash: string;
  userAgentHash: string | null;
  startedAt: number;
}

function appErrorForSecurityFailure(result: SecurityResult<unknown>): AppError {
  if (result.ok) {
    return new AppError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }

  return new AppError("INVALID_URL", "URL is invalid or blocked.", 400);
}

function getHeaderValue(value: string | string[] | undefined, fallback: string): string {
  const firstValue = Array.isArray(value) ? value[0] : value;

  return firstValue === undefined || firstValue.length === 0 ? fallback : firstValue;
}

function getHash(result: SecurityResult<string>): string {
  if (!result.ok) {
    throw new AppError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }

  return result.value;
}

function errorForPlatform(platform: PlatformRecord | null): AppError | null {
  if (platform === null) {
    return new AppError("UNSUPPORTED_DOMAIN", "URL domain is not supported.", 400);
  }

  if (platform.status === "maintenance") {
    return new AppError("PLATFORM_MAINTENANCE", "Platform is under maintenance.", 503);
  }

  if (!platform.isActive || platform.status !== "active") {
    return new AppError("PLATFORM_INACTIVE", "Platform is not active.", 400);
  }

  return null;
}

function responseStatusForError(errorCode: string): RequestLogStatus {
  if (errorCode === "MAINTENANCE_MODE" || errorCode === "PLATFORM_MAINTENANCE") {
    return "maintenance";
  }

  if (errorCode === "RATE_LIMITED") {
    return "rate_limited";
  }

  return "blocked";
}

async function persistRequestLog(
  repositories: ApiRepositories,
  request: FastifyRequest,
  context: SafeRequestLogContext,
  status: RequestLogStatus,
  errorCode: string | null
): Promise<void> {
  const input: CreateRequestLogInput = {
    request_id: context.requestId,
    platform_slug: context.platformSlug,
    provider_slug: context.providerSlug,
    url_hash: context.urlHash,
    ip_hash: context.ipHash,
    user_agent_hash: context.userAgentHash,
    status,
    error_code: errorCode,
    response_time_ms: Math.max(0, Date.now() - context.startedAt),
    country_code: null
  };

  try {
    await repositories.requestLogs.createRequestLog(input);
  } catch (error) {
    request.log.warn(
      {
        requestId: context.requestId,
        error
      },
      "request_log_write_failed"
    );
  }
}

async function throwAndLog(
  repositories: ApiRepositories,
  request: FastifyRequest,
  context: SafeRequestLogContext,
  error: AppError
): Promise<never> {
  await persistRequestLog(repositories, request, context, responseStatusForError(error.code), error.code);
  throw error;
}

const downloadQuerySchema = z
  .object({
    vid: z.string().min(1, "URL is required.")
  })
  .strict();

function extractUrl(request: FastifyRequest): string {
  if (request.method === "GET") {
    const parsed = downloadQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Missing or invalid 'vid' query parameter.", 400);
    }
    return parsed.data.vid;
  }
  const parsedBody = downloadRequestSchema.safeParse(request.body);
  if (!parsedBody.success) {
    throw new AppError("VALIDATION_FAILED", "Invalid request payload.", 400);
  }
  return parsedBody.data.url;
}

export function createDownloadHandler(options: DownloadHandlerOptions = {}) {
  return async function downloadHandler(request: FastifyRequest, reply: FastifyReply) {
    const repositories = options.repositories ?? createDefaultRepositories();
    const startedAt = Date.now();
    const rawUrl = extractUrl(request);
    const sanitizedUrl = sanitizeUrl(rawUrl);

    if (!sanitizedUrl.ok) {
      throw appErrorForSecurityFailure(sanitizedUrl);
    }

    const ssrfOptions = options.ssrfResolveHostname
      ? {
          resolveHostname: options.ssrfResolveHostname
        }
      : {};
    const ssrfResult = await validateNoSsrfTarget(sanitizedUrl.value.href, ssrfOptions);

    if (!ssrfResult.ok) {
      throw appErrorForSecurityFailure(ssrfResult);
    }

    const userAgent = getHeaderValue(request.headers["user-agent"], "missing");
    const logContext: SafeRequestLogContext = {
      requestId: request.publicRequestId,
      platformSlug: null,
      providerSlug: null,
      urlHash: getHash(hashSubmittedUrl(sanitizedUrl.value.href, env.IP_HASH_SECRET)),
      ipHash: getHash(hashIpAddress(request.ip, env.IP_HASH_SECRET)),
      userAgentHash: getHash(hashUserAgent(userAgent, env.IP_HASH_SECRET)),
      startedAt
    };
    const platform = await repositories.platforms.getPlatformByDomain(sanitizedUrl.value.hostname);
    const platformError = errorForPlatform(platform);

    if (platform !== null) {
      logContext.platformSlug = platform.slug;
    }

    if (platformError !== null) {
      await throwAndLog(repositories, request, logContext, platformError);
    }

    const isBlockedDomain = await repositories.blocklist.isDomainBlocked(sanitizedUrl.value.hostname);

    if (isBlockedDomain) {
      await throwAndLog(
        repositories,
        request,
        logContext,
        new AppError("BLOCKED_DOMAIN", "URL domain is blocked.", 400)
      );
    }

    const matchedPattern = await repositories.blocklist.findMatchingBlockedPattern(sanitizedUrl.value.href);

    if (matchedPattern !== null) {
      await throwAndLog(
        repositories,
        request,
        logContext,
        new AppError("BLOCKED_URL_PATTERN", "URL is blocked.", 400)
      );
    }

    await enforcePublicDownloadRateLimit();
    await ensurePublicDownloadAvailable();

    const maintenance = await repositories.settings.getMaintenanceStatus();

    if (maintenance.maintenanceMode) {
      await throwAndLog(
        repositories,
        request,
        logContext,
        new AppError(
          "MAINTENANCE_MODE",
          maintenance.maintenanceMessage ?? "Service is under maintenance.",
          503
        )
      );
    }

    request.log.info(
      {
        requestId: request.publicRequestId,
        platform: logContext.platformSlug,
        urlHash: logContext.urlHash,
        ipHash: logContext.ipHash,
        userAgentHash: logContext.userAgentHash
      },
      "public_download_security_validated"
    );

    const activeProviders = platform
      ? await repositories.providers.getActiveProvidersForPlatform(platform.slug)
      : [];

    if (activeProviders.length === 0) {
      await persistRequestLog(repositories, request, logContext, "failed", "PROVIDER_NOT_IMPLEMENTED");

      return reply.status(501).send({
        success: false,
        error: {
          code: "PROVIDER_NOT_IMPLEMENTED",
          message: "Provider integration is not implemented yet."
        },
        requestId: request.publicRequestId
      });
    }

    const adapter = options.providerAdapter ?? defaultProviderAdapter;

    let lastProviderError: AppError | null = null;

    for (const provider of activeProviders) {
      logContext.providerSlug = provider.slug;
      try {
        const mediaResult = await adapter.extractMedia(sanitizedUrl.value.href, provider);
        await repositories.providers.incrementProviderUsage(provider.id);
        await persistRequestLog(repositories, request, logContext, "success", null);

        const streamEncryptionKey = env.API_KEY_ENCRYPTION_KEY;
        const mappedMedia = mediaResult.media.map((item, index) => {
          const isAlreadyStream = item.url.startsWith("/api/v1/download/stream");
          if (!isAlreadyStream) {
            const ext =
              item.format === "image"
                ? "jpg"
                : /^[a-z0-9]{2,5}$/i.test(item.format)
                  ? item.format.toLowerCase()
                  : "mp4";
            const sanitizedTitle = (mediaResult.title || "")
              .trim()
              .replaceAll(/[^\w.-]/g, "_")
              .replace(/_+/g, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 30);
            const safeTitle = sanitizedTitle.length > 0 ? sanitizedTitle : "media";
            const filename = `fastvid_${safeTitle}_${index + 1}.${ext}`;
            const token = createStreamToken(
              {
                url: item.url,
                headers: item.headers,
                filename,
                expiresAt: Date.now() + 3600 * 1000
              },
              streamEncryptionKey
            );

            return {
              format: item.format,
              hasAudio: item.hasAudio,
              quality: item.quality,
              sizeBytes: item.sizeBytes,
              url: `/api/v1/download/stream?token=${token}`
            };
          }

          return {
            format: item.format,
            hasAudio: item.hasAudio,
            quality: item.quality,
            sizeBytes: item.sizeBytes,
            url: item.url
          };
        });

        return reply.status(200).send({
          success: true,
          data: {
            status: "ready",
            platform: platform?.slug ?? provider.platformSlug,
            title: mediaResult.title,
            thumbnailUrl: mediaResult.thumbnailUrl,
            duration: mediaResult.duration,
            author: mediaResult.author,
            media: mappedMedia
          },
          requestId: request.publicRequestId
        });
      } catch (err: unknown) {
        if (err instanceof AppError) {
          lastProviderError = err;
        }
        await repositories.providers.recordProviderError(
          provider.id,
          (err as Error)?.message ?? "Unknown provider error"
        );
        request.log.warn(
          {
            requestId: request.publicRequestId,
            provider: provider.slug,
            error: (err as Error)?.message
          },
          "provider_attempt_failed"
        );
      }
    }

    const statusCode = lastProviderError?.statusCode ?? 502;
    const errorCode = lastProviderError?.code ?? "PROVIDER_ERROR";
    const errorMessage = lastProviderError?.message ?? "Provider downloader sedang tidak dapat memproses video saat ini. Silakan coba sesaat lagi.";

    await persistRequestLog(repositories, request, logContext, "failed", errorCode);

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      },
      requestId: request.publicRequestId
    });
  };
}
