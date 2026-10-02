import { Buffer } from "node:buffer";
import { decryptApiKey, validateNoSsrfTarget, type DnsAddress } from "@vidsaveid/security";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { PublicProviderRecord } from "../repositories/provider.repository.js";

export interface ExtractedMediaItem {
  format: "mp4" | "mp3" | "webm" | "image" | string;
  hasAudio?: boolean | undefined;
  headers?: Record<string, string> | undefined;
  quality: string;
  sizeBytes?: number | undefined;
  url: string;
}

export interface ExtractedMediaResult {
  author?: string | null | undefined;
  duration?: number | null | undefined;
  media: ExtractedMediaItem[];
  platform: string;
  thumbnailUrl?: string | null | undefined;
  title: string;
}

export interface ProviderAdapterOptions {
  fetchFn?: typeof fetch | undefined;
  timeoutMs?: number | undefined;
  ssrfResolveHostname?: ((hostname: string) => Promise<readonly DnsAddress[]>) | undefined;
}

function resolveApiKey(encryptedKey: string | null): string | null {
  if (!encryptedKey || encryptedKey.trim().length === 0) {
    return null;
  }

  try {
    const keyBuffer = Buffer.from(env.API_KEY_ENCRYPTION_KEY, "base64");
    const result = decryptApiKey(encryptedKey, keyBuffer);
    return result.ok ? result.value : null;
  } catch {
    return null;
  }
}

function normalizeMediaItems(payload: Record<string, unknown>, _platformSlug: string): ExtractedMediaItem[] {
  const items: ExtractedMediaItem[] = [];

  // 1. Cobalt status: "tunnel" | "redirect"
  if (typeof payload.url === "string" && payload.url.startsWith("http")) {
    items.push({
      format: "mp4",
      hasAudio: true,
      quality: "Default Quality",
      url: payload.url
    });
  }

  // 2. Cobalt status: "picker" (picker items)
  if (Array.isArray(payload.picker)) {
    for (const p of payload.picker) {
      if (typeof p === "object" && p !== null && typeof (p as Record<string, unknown>).url === "string") {
        const pObj = p as Record<string, unknown>;
        const pUrl = String(pObj.url);
        const pType = String(pObj.type ?? "video");
        items.push({
          format: pType === "photo" ? "image" : "mp4",
          hasAudio: pType !== "photo",
          quality: String(pObj.thumb ? "Thumbnail" : "HD Quality"),
          url: pUrl
        });
      }
    }
  }

  let videoHeaders: Record<string, string> | undefined;

  // 3. Object-based media (Kyzzz / Tikwm / similar providers)
  if (typeof payload.media === "object" && payload.media !== null && !Array.isArray(payload.media)) {
    const mediaObj = payload.media as Record<string, unknown>;
    if (typeof mediaObj.video === "object" && mediaObj.video !== null) {
      const v = mediaObj.video as Record<string, unknown>;
      const vUrl = typeof v.downloadUrl === "string" ? v.downloadUrl : typeof v.directStreamUrl === "string" ? v.directStreamUrl : typeof v.url === "string" ? v.url : null;
      videoHeaders = typeof v.headers === "object" && v.headers !== null ? (v.headers as Record<string, string>) : undefined;

      if (vUrl && vUrl.startsWith("http")) {
        const vQuality = typeof v.quality === "string" && v.quality.trim().length > 0 ? v.quality.toUpperCase() : "HD (No Watermark)";
        items.push({
          format: typeof v.format === "string" ? v.format : "mp4",
          hasAudio: true,
          headers: videoHeaders,
          quality: vQuality,
          url: vUrl
        });
      }
      if (typeof v.watermarkUrl === "string" && v.watermarkUrl.startsWith("http")) {
        items.push({
          format: typeof v.format === "string" ? v.format : "mp4",
          hasAudio: true,
          headers: videoHeaders,
          quality: "With Watermark",
          url: v.watermarkUrl
        });
      }
    }

    if (Array.isArray(mediaObj.images)) {
      for (const img of mediaObj.images) {
        const imgUrl = typeof img === "string" ? img : (typeof img === "object" && img !== null && typeof (img as Record<string, unknown>).url === "string") ? (img as Record<string, unknown>).url as string : null;
        if (imgUrl && imgUrl.startsWith("http")) {
          items.push({
            format: "image",
            hasAudio: false,
            quality: "HD Image",
            url: imgUrl
          });
        }
      }
    }
  }

  // 4. Object-based music / audio (from Kyzzz / Tikwm)
  if (typeof payload.music === "object" && payload.music !== null) {
    const m = payload.music as Record<string, unknown>;
    const mUrl = typeof m.playUrl === "string" ? m.playUrl : typeof m.url === "string" ? m.url : null;
    if (mUrl && mUrl.startsWith("http")) {
      items.push({
        format: "mp3",
        hasAudio: true,
        headers: videoHeaders,
        quality: "Audio (MP3)",
        url: mUrl
      });
    }
  }

  // 5. Array of images (slides / gallery)
  if (Array.isArray(payload.images)) {
    for (const img of payload.images) {
      const imgUrl = typeof img === "string" ? img : (typeof img === "object" && img !== null && typeof (img as Record<string, unknown>).url === "string") ? (img as Record<string, unknown>).url as string : null;
      if (imgUrl && imgUrl.startsWith("http")) {
        items.push({
          format: "image",
          hasAudio: false,
          quality: "HD Image",
          url: imgUrl
        });
      }
    }
  }

  // 6. Standard array of formats/media
  const formatsArray = Array.isArray(payload.media)
    ? payload.media
    : Array.isArray(payload.formats)
      ? payload.formats
      : Array.isArray(payload.links)
        ? payload.links
        : null;

  if (formatsArray !== null) {
    for (const f of formatsArray) {
      if (typeof f === "object" && f !== null) {
        const item = f as Record<string, unknown>;
        const url = typeof item.url === "string" ? item.url : typeof item.link === "string" ? item.link : null;
        if (url && url.startsWith("http")) {
          items.push({
            format: typeof item.format === "string" ? item.format : "mp4",
            hasAudio: item.hasAudio !== false,
            quality: typeof item.quality === "string" ? item.quality : typeof item.resolution === "string" ? item.resolution : "Standard",
            sizeBytes: typeof item.size === "number" ? item.size : typeof item.sizeBytes === "number" ? item.sizeBytes : undefined,
            url
          });
        }
      }
    }
  }

  // 7. Object format: { video: "...", audio: "..." }
  if (typeof payload.video === "string" && payload.video.startsWith("http")) {
    items.push({
      format: "mp4",
      hasAudio: true,
      quality: "Video (MP4)",
      url: payload.video
    });
  }
  if (typeof payload.audio === "string" && payload.audio.startsWith("http")) {
    items.push({
      format: "mp3",
      hasAudio: true,
      quality: "Audio (MP3)",
      url: payload.audio
    });
  }

  return items;
}

export class ProviderAdapter {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly ssrfResolveHostname?: ((hostname: string) => Promise<readonly DnsAddress[]>) | undefined;

  constructor(options: ProviderAdapterOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.ssrfResolveHostname = options.ssrfResolveHostname;
  }

  async extractMedia(targetUrl: string, provider: PublicProviderRecord): Promise<ExtractedMediaResult> {
    // 1. SSRF check on provider base URL
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(provider.baseUrl);
    } catch {
      throw new AppError("PROVIDER_ERROR", "Provider URL tidak valid.", 502);
    }

    // Auto-resolve endpoint path if only host was provided for known providers
    if ((parsedBaseUrl.pathname === "/" || parsedBaseUrl.pathname === "") && parsedBaseUrl.hostname.includes("kyzzz.xyz")) {
      parsedBaseUrl.pathname = `/api/download/${provider.platformSlug}`;
    }

    const ssrfOptions = this.ssrfResolveHostname
      ? { resolveHostname: this.ssrfResolveHostname }
      : {};
    const ssrfResult = await validateNoSsrfTarget(parsedBaseUrl.href, ssrfOptions);
    if (!ssrfResult.ok) {
      throw new AppError("PROVIDER_ERROR", "Provider target tidak diizinkan oleh kebijakan keamanan.", 502);
    }

    // 2. Prepare headers (support public and private APIs)
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "FastVid/1.0 (+https://fastvid.my.id)"
    };

    const apiKey = resolveApiKey(provider.apiKeyEncrypted);
    if (apiKey) {
      // Private API Mode: include authorization headers
      headers.Authorization = `Bearer ${apiKey}`;
      headers["x-api-key"] = apiKey;
      headers["X-RapidAPI-Key"] = apiKey;
    }

    // Determine if endpoint prefers GET (kyzzz, standard REST download query APIs)
    const prefersGet = parsedBaseUrl.hostname.includes("kyzzz.xyz") || parsedBaseUrl.pathname.includes("/api/download/");

    // 3. Execute request with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      if (prefersGet) {
        const getUrl = new URL(parsedBaseUrl.href);
        getUrl.searchParams.set("url", targetUrl);
        if (apiKey) {
          getUrl.searchParams.set("apikey", apiKey);
        }
        response = await this.fetchFn(getUrl.href, {
          method: "GET",
          headers,
          signal: controller.signal
        });
      } else {
        response = await this.fetchFn(parsedBaseUrl.href, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: targetUrl,
            videoQuality: "max",
            audioFormat: "mp3"
          }),
          signal: controller.signal
        });

        // If POST method not allowed on endpoint, try GET with query parameter
        if (response.status === 404 || response.status === 405) {
          const getUrl = new URL(parsedBaseUrl.href);
          getUrl.searchParams.set("url", targetUrl);
          if (apiKey) {
            getUrl.searchParams.set("apikey", apiKey);
          }
          response = await this.fetchFn(getUrl.href, {
            method: "GET",
            headers,
            signal: controller.signal
          });
        }
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === "AbortError";
      throw new AppError(
        "PROVIDER_TIMEOUT",
        isAbort ? "Permintaan ke provider waktu habis (timeout)." : "Koneksi ke provider gagal.",
        504
      );
    } finally {
      clearTimeout(timer);
    }

    let jsonPayload: unknown;
    try {
      jsonPayload = await response.json();
    } catch {
      if (!response.ok) {
        throw new AppError(
          "PROVIDER_ERROR",
          `Provider mengembalikan status ${response.status}.`,
          502
        );
      }
      throw new AppError("PROVIDER_ERROR", "Respons provider bukan JSON yang valid.", 502);
    }

    if (typeof jsonPayload !== "object" || jsonPayload === null) {
      if (!response.ok) {
        throw new AppError(
          "PROVIDER_ERROR",
          `Provider mengembalikan status ${response.status}.`,
          502
        );
      }
      throw new AppError("PROVIDER_ERROR", "Payload provider tidak valid.", 502);
    }

    const payload = jsonPayload as Record<string, unknown>;

    // Provider-level error checking (e.g. status: false or non-ok with error message)
    if (!response.ok || payload.status === false || payload.success === false) {
      const errorMsg = typeof payload.error === "string" && payload.error.trim().length > 0
        ? payload.error.trim()
        : typeof payload.message === "string" && payload.message.trim().length > 0
          ? payload.message.trim()
          : !response.ok
            ? `Provider mengembalikan status ${response.status}.`
            : "Video tidak ditemukan, bersifat privat, atau tidak didukung.";
      throw new AppError("PROVIDER_ERROR", errorMsg, 422);
    }

    // Unwrap { data: ... } or { result: ... } if nested
    const rootData = (typeof payload.data === "object" && payload.data !== null)
      ? (payload.data as Record<string, unknown>)
      : (typeof payload.result === "object" && payload.result !== null)
        ? (payload.result as Record<string, unknown>)
        : payload;

    const mediaItems = normalizeMediaItems(rootData, provider.platformSlug);

    if (mediaItems.length === 0) {
      throw new AppError(
        "PROVIDER_NO_MEDIA",
        "Tidak ditemukan format media yang dapat diunduh untuk link ini.",
        422
      );
    }

    const mediaObj = typeof rootData.media === "object" && rootData.media !== null && !Array.isArray(rootData.media)
      ? (rootData.media as Record<string, unknown>)
      : null;
    const videoObj = mediaObj && typeof mediaObj.video === "object" && mediaObj.video !== null
      ? (mediaObj.video as Record<string, unknown>)
      : null;

    const title = typeof rootData.title === "string" && rootData.title.trim().length > 0
      ? rootData.title.trim()
      : typeof rootData.description === "string" && rootData.description.trim().length > 0
        ? rootData.description.trim().slice(0, 120)
        : typeof rootData.desc === "string" && rootData.desc.trim().length > 0
          ? rootData.desc.trim().slice(0, 120)
          : typeof payload.text === "string" && payload.text.trim().length > 0
            ? payload.text.trim().slice(0, 120)
            : `Video ${provider.platformSlug.toUpperCase()}`;

    let author: string | null = null;
    if (typeof rootData.author === "object" && rootData.author !== null) {
      const authorObj = rootData.author as Record<string, unknown>;
      author = typeof authorObj.nickname === "string" && authorObj.nickname.trim().length > 0
        ? authorObj.nickname.trim()
        : typeof authorObj.username === "string" && authorObj.username.trim().length > 0
          ? authorObj.username.trim()
          : typeof authorObj.name === "string" && authorObj.name.trim().length > 0
            ? authorObj.name.trim()
            : null;
    } else if (typeof rootData.author === "string" && rootData.author.trim().length > 0) {
      author = rootData.author.trim();
    } else if (typeof rootData.nickname === "string" && rootData.nickname.trim().length > 0) {
      author = rootData.nickname.trim();
    } else if (typeof rootData.author_name === "string" && rootData.author_name.trim().length > 0) {
      author = rootData.author_name.trim();
    }

    const thumbnailUrl = typeof rootData.thumbnail === "string"
      ? rootData.thumbnail
      : typeof rootData.thumbnailUrl === "string"
        ? rootData.thumbnailUrl
        : typeof rootData.cover === "string"
          ? rootData.cover
          : typeof videoObj?.cover === "string"
            ? (videoObj.cover as string)
            : typeof videoObj?.dynamicCover === "string"
              ? (videoObj.dynamicCover as string)
              : null;

    const duration = typeof rootData.duration === "number"
      ? rootData.duration
      : typeof videoObj?.duration === "number"
        ? (videoObj.duration as number)
        : null;

    return {
      title,
      thumbnailUrl,
      duration,
      platform: provider.platformSlug,
      author,
      media: mediaItems
    };
  }
}

export const defaultProviderAdapter = new ProviderAdapter();
