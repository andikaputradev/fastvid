import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import type { FastifyReply, FastifyRequest } from "fastify";
import { sanitizeUrl, validateNoSsrfTarget, type DnsAddress } from "@vidsaveid/security";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import { parseStreamToken } from "../../services/streamToken.js";

const streamQuerySchema = z.object({
  token: z.string().min(10, "Token is required.")
});

export interface DownloadStreamHandlerOptions {
  fetchFn?: typeof fetch | undefined;
  ssrfResolveHostname?: ((hostname: string) => Promise<readonly DnsAddress[]>) | undefined;
}

export function createDownloadStreamHandler(options: DownloadStreamHandlerOptions = {}) {
  return async function downloadStreamHandler(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = streamQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw new AppError("VALIDATION_FAILED", "Parameter token tidak valid.", 400);
    }

    const payload = parseStreamToken(parseResult.data.token, env.API_KEY_ENCRYPTION_KEY);
    if (!payload) {
      throw new AppError("INVALID_TOKEN", "Token unduhan tidak valid atau telah kedaluwarsa.", 403);
    }

    const sanitizedUrl = sanitizeUrl(payload.url);
    if (!sanitizedUrl.ok) {
      throw new AppError("INVALID_URL", "URL target tidak valid.", 400);
    }

    const ssrfOptions = options.ssrfResolveHostname
      ? { resolveHostname: options.ssrfResolveHostname }
      : {};
    const ssrfResult = await validateNoSsrfTarget(sanitizedUrl.value.href, ssrfOptions);
    if (!ssrfResult.ok) {
      throw new AppError("FORBIDDEN_TARGET", "Target tidak diizinkan oleh kebijakan keamanan.", 403);
    }

    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
    };

    if (payload.headers) {
      for (const [key, val] of Object.entries(payload.headers)) {
        if (typeof val === "string" && val.length > 0) {
          upstreamHeaders[key] = val;
        }
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    let upstreamRes: Response;
    try {
      upstreamRes = await (options.fetchFn ?? fetch)(sanitizedUrl.value.href, {
        method: "GET",
        headers: upstreamHeaders,
        signal: controller.signal
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === "AbortError";
      throw new AppError(
        "STREAM_TIMEOUT",
        isAbort ? "Waktu unduhan habis." : "Gagal terhubung ke server media.",
        504
      );
    } finally {
      clearTimeout(timer);
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      throw new AppError("UPSTREAM_ERROR", `Server media mengembalikan status ${upstreamRes.status}.`, 502);
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/octet-stream";
    if (contentType.includes("application/json")) {
      const text = await upstreamRes.text();
      let msg = "Gagal mengunduh media dari server penyedia.";
      try {
        const json = JSON.parse(text) as { message?: string; msg?: string; error?: string };
        const found = json.message || json.msg || json.error;
        if (typeof found === "string" && found.trim().length > 0) {
          msg = found.trim();
        }
      } catch {
        // fallback to default msg
      }
      throw new AppError("UPSTREAM_ERROR", msg, 502);
    }

    const contentLength = upstreamRes.headers.get("content-length");
    const safeFilename = (payload.filename || "fastvid_download.mp4").replaceAll(/[^\w.-]/g, "_");

    reply.header("Content-Type", contentType);
    if (contentLength) {
      reply.header("Content-Length", contentLength);
    }
    reply.header("Content-Disposition", `attachment; filename="${safeFilename}"`);
    reply.header("Cache-Control", "private, no-cache, no-store, must-revalidate");

    const nodeReadable = Readable.fromWeb(upstreamRes.body as WebReadableStream);
    return reply.send(nodeReadable);
  };
}
