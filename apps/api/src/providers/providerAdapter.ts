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

function normalizeMediaItems(payload: Record<string, unknown> | unknown[], _platformSlug: string): ExtractedMediaItem[] {
  const items: ExtractedMediaItem[] = [];
  const seenUrls = new Set<string>();

  const addItem = (item: ExtractedMediaItem) => {
    if (!item.url || typeof item.url !== "string" || !item.url.startsWith("http")) {
      return;
    }
    const cleanUrl = item.url.trim();
    if (seenUrls.has(cleanUrl)) {
      return;
    }
    seenUrls.add(cleanUrl);
    items.push({ ...item, url: cleanUrl });
  };

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        const u =
          typeof obj.url === "string"
            ? obj.url
            : typeof obj.download_url === "string"
              ? obj.download_url
              : typeof obj.downloadUrl === "string"
                ? obj.downloadUrl
                : null;
        if (u) {
          addItem({
            format:
              typeof obj.format === "string"
                ? obj.format
                : typeof obj.type === "string" && obj.type === "photo"
                  ? "image"
                  : "mp4",
            hasAudio: obj.hasAudio !== false,
            quality: typeof obj.quality === "string" ? obj.quality : "HD Quality",
            url: u
          });
        }
      }
    }
    return items;
  }

  let videoHeaders: Record<string, string> | undefined;

  // 1. Direct Tikwm / Kyzzz / Douyin play URLs at root level
  const rootHdPlay =
    typeof payload.hdplay === "string"
      ? payload.hdplay
      : typeof payload.hd_play_url === "string"
        ? payload.hd_play_url
        : typeof payload.hdPlayUrl === "string"
          ? payload.hdPlayUrl
          : null;
  if (rootHdPlay) {
    addItem({
      format: "mp4",
      hasAudio: true,
      quality: "HD (No Watermark)",
      url: rootHdPlay
    });
  }

  const rootPlay =
    typeof payload.play === "string"
      ? payload.play
      : typeof payload.play_url === "string"
        ? payload.play_url
        : typeof payload.playUrl === "string"
          ? payload.playUrl
          : typeof payload.nowm === "string"
            ? payload.nowm
            : typeof payload.no_watermark === "string"
              ? payload.no_watermark
              : null;
  if (rootPlay) {
    addItem({
      format: "mp4",
      hasAudio: true,
      quality: items.length > 0 ? "Default (No Watermark)" : "HD (No Watermark)",
      url: rootPlay
    });
  }

  const rootWmPlay =
    typeof payload.wmplay === "string"
      ? payload.wmplay
      : typeof payload.wm_play_url === "string"
        ? payload.wm_play_url
        : typeof payload.wmPlayUrl === "string"
          ? payload.wmPlayUrl
          : typeof payload.watermark_url === "string"
            ? payload.watermark_url
            : typeof payload.watermarkUrl === "string"
              ? payload.watermarkUrl
              : null;
  if (rootWmPlay) {
    addItem({
      format: "mp4",
      hasAudio: true,
      quality: "With Watermark",
      url: rootWmPlay
    });
  }

  // 2. Generic root video / download URLs
  const rootVideoUrl =
    typeof payload.video_url === "string"
      ? payload.video_url
      : typeof payload.videoUrl === "string"
        ? payload.videoUrl
        : typeof payload.download_url === "string"
          ? payload.download_url
          : typeof payload.downloadUrl === "string"
            ? payload.downloadUrl
            : null;
  if (rootVideoUrl) {
    addItem({
      format: "mp4",
      hasAudio: true,
      quality: "HD Video",
      url: rootVideoUrl
    });
  }

  // 3. Cobalt status: "tunnel" | "redirect"
  if (typeof payload.url === "string" && payload.url.startsWith("http")) {
    addItem({
      format: "mp4",
      hasAudio: true,
      quality: "Default Quality",
      url: payload.url
    });
  }

  // 4. Cobalt status: "picker" (picker items)
  if (Array.isArray(payload.picker)) {
    for (const p of payload.picker) {
      if (typeof p === "object" && p !== null && typeof (p as Record<string, unknown>).url === "string") {
        const pObj = p as Record<string, unknown>;
        const pUrl = String(pObj.url);
        const pType = String(pObj.type ?? "video");
        addItem({
          format: pType === "photo" ? "image" : "mp4",
          hasAudio: pType !== "photo",
          quality: String(pObj.thumb ? "Thumbnail" : "HD Quality"),
          url: pUrl
        });
      }
    }
  }

  // 5. Nested media object (Kyzzz / Tikwm / similar providers)
  if (typeof payload.media === "object" && payload.media !== null && !Array.isArray(payload.media)) {
    const mediaObj = payload.media as Record<string, unknown>;

    // Video object inside media
    if (typeof mediaObj.video === "object" && mediaObj.video !== null) {
      const v = mediaObj.video as Record<string, unknown>;
      videoHeaders = typeof v.headers === "object" && v.headers !== null ? (v.headers as Record<string, string>) : undefined;

      const vHd = typeof v.hdplay === "string" ? v.hdplay : typeof v.hd === "string" ? v.hd : null;
      if (vHd) {
        addItem({
          format: "mp4",
          hasAudio: true,
          headers: videoHeaders,
          quality: "HD (No Watermark)",
          url: vHd
        });
      }

      const vUrl =
        typeof v.downloadUrl === "string"
          ? v.downloadUrl
          : typeof v.download_url === "string"
            ? v.download_url
            : typeof v.directStreamUrl === "string"
              ? v.directStreamUrl
              : typeof v.play === "string"
                ? v.play
                : typeof v.playUrl === "string"
                  ? v.playUrl
                  : typeof v.play_url === "string"
                    ? v.play_url
                    : typeof v.noWatermark === "string"
                      ? v.noWatermark
                      : typeof v.url === "string"
                        ? v.url
                        : null;

      if (vUrl) {
        const vQuality = typeof v.quality === "string" && v.quality.trim().length > 0 ? v.quality.toUpperCase() : "HD (No Watermark)";
        addItem({
          format: typeof v.format === "string" ? v.format : "mp4",
          hasAudio: true,
          headers: videoHeaders,
          quality: vQuality,
          url: vUrl
        });
      }

      const vWm =
        typeof v.watermarkUrl === "string"
          ? v.watermarkUrl
          : typeof v.watermark_url === "string"
            ? v.watermark_url
            : typeof v.wmplay === "string"
              ? v.wmplay
              : typeof v.watermark === "string"
                ? v.watermark
                : null;

      if (vWm) {
        addItem({
          format: typeof v.format === "string" ? v.format : "mp4",
          hasAudio: true,
          headers: videoHeaders,
          quality: "With Watermark",
          url: vWm
        });
      }
    }

    // Direct play URLs inside media
    const mediaPlay = typeof mediaObj.play === "string" ? mediaObj.play : typeof mediaObj.play_url === "string" ? mediaObj.play_url : null;
    if (mediaPlay) {
      addItem({
        format: "mp4",
        hasAudio: true,
        quality: "HD (No Watermark)",
        url: mediaPlay
      });
    }

    // Images inside media
    const mediaImages = Array.isArray(mediaObj.images) ? mediaObj.images : Array.isArray(mediaObj.photos) ? mediaObj.photos : null;
    if (mediaImages) {
      mediaImages.forEach((img, idx) => {
        const imgObj = typeof img === "object" && img !== null ? (img as Record<string, unknown>) : null;
        const imgUrl =
          typeof img === "string"
            ? img
            : imgObj
              ? typeof imgObj.url === "string"
                ? imgObj.url
                : typeof imgObj.display_url === "string"
                  ? imgObj.display_url
                  : typeof imgObj.image_url === "string"
                    ? imgObj.image_url
                    : null
              : null;
        if (imgUrl) {
          addItem({
            format: "image",
            hasAudio: false,
            quality: mediaImages.length > 1 ? `Foto ${idx + 1} (HD)` : "HD Image",
            url: imgUrl
          });
        }
      });
    }

    // Music inside media
    if (typeof mediaObj.music === "object" && mediaObj.music !== null) {
      const m = mediaObj.music as Record<string, unknown>;
      const mUrl = typeof m.playUrl === "string" ? m.playUrl : typeof m.play === "string" ? m.play : typeof m.url === "string" ? m.url : null;
      if (mUrl) {
        addItem({
          format: "mp3",
          hasAudio: true,
          headers: videoHeaders,
          quality: "Audio (MP3)",
          url: mUrl
        });
      }
    } else if (typeof mediaObj.music === "string") {
      addItem({
        format: "mp3",
        hasAudio: true,
        headers: videoHeaders,
        quality: "Audio (MP3)",
        url: mediaObj.music
      });
    }
  }

  // 6. Root video object (when video is an object, not a string)
  if (typeof payload.video === "object" && payload.video !== null) {
    const v = payload.video as Record<string, unknown>;
    const vUrl =
      typeof v.downloadUrl === "string"
        ? v.downloadUrl
        : typeof v.play === "string"
          ? v.play
          : typeof v.playUrl === "string"
            ? v.playUrl
            : typeof v.url === "string"
              ? v.url
              : typeof v.noWatermark === "string"
                ? v.noWatermark
                : null;
    if (vUrl) {
      addItem({
        format: "mp4",
        hasAudio: true,
        quality: "HD (No Watermark)",
        url: vUrl
      });
    }
    const vWm =
      typeof v.watermarkUrl === "string"
        ? v.watermarkUrl
        : typeof v.wmplay === "string"
          ? v.wmplay
          : typeof v.watermark === "string"
            ? v.watermark
            : null;
    if (vWm) {
      addItem({
        format: "mp4",
        hasAudio: true,
        quality: "With Watermark",
        url: vWm
      });
    }
  } else if (typeof payload.video === "string" && payload.video.startsWith("http")) {
    addItem({
      format: "mp4",
      hasAudio: true,
      quality: "Video (MP4)",
      url: payload.video
    });
  }

  // 7. Root images / photo slide array
  const rootImages = Array.isArray(payload.images) ? payload.images : Array.isArray(payload.photos) ? payload.photos : null;
  if (rootImages) {
    rootImages.forEach((img, idx) => {
      const imgObj = typeof img === "object" && img !== null ? (img as Record<string, unknown>) : null;
      const imgUrl =
        typeof img === "string"
          ? img
          : imgObj
            ? typeof imgObj.url === "string"
              ? imgObj.url
              : typeof imgObj.display_url === "string"
                ? imgObj.display_url
                : typeof imgObj.image_url === "string"
                  ? imgObj.image_url
                  : null
            : null;
      if (imgUrl) {
        addItem({
          format: "image",
          hasAudio: false,
          quality: rootImages.length > 1 ? `Foto ${idx + 1} (HD)` : "HD Image",
          url: imgUrl
        });
      }
    });
  }

  // 8. Standard formats / media / links / urls / downloads arrays
  const formatsArray = Array.isArray(payload.media)
    ? payload.media
    : Array.isArray(payload.formats)
      ? payload.formats
      : Array.isArray(payload.links)
        ? payload.links
        : Array.isArray(payload.urls)
          ? payload.urls
          : Array.isArray(payload.downloads)
            ? payload.downloads
            : null;

  if (formatsArray !== null) {
    for (const f of formatsArray) {
      if (typeof f === "object" && f !== null) {
        const item = f as Record<string, unknown>;
        const url = typeof item.url === "string" ? item.url : typeof item.link === "string" ? item.link : null;
        if (url) {
          addItem({
            format: typeof item.format === "string" ? item.format : "mp4",
            hasAudio: item.hasAudio !== false,
            quality: typeof item.quality === "string" ? item.quality : typeof item.resolution === "string" ? item.resolution : "Standard",
            sizeBytes: typeof item.size === "number" ? item.size : typeof item.sizeBytes === "number" ? item.sizeBytes : undefined,
            url
          });
        }
      } else if (typeof f === "string") {
        addItem({
          format: "mp4",
          hasAudio: true,
          quality: "Standard",
          url: f
        });
      }
    }
  }

  // 9. Root music / audio
  if (typeof payload.music === "string" && payload.music.startsWith("http")) {
    addItem({
      format: "mp3",
      hasAudio: true,
      headers: videoHeaders,
      quality: "Audio (MP3)",
      url: payload.music
    });
  } else if (typeof payload.music === "object" && payload.music !== null) {
    const m = payload.music as Record<string, unknown>;
    const mUrl =
      typeof m.playUrl === "string"
        ? m.playUrl
        : typeof m.play === "string"
          ? m.play
          : typeof m.url === "string"
            ? m.url
            : null;
    if (mUrl) {
      addItem({
        format: "mp3",
        hasAudio: true,
        headers: videoHeaders,
        quality: "Audio (MP3)",
        url: mUrl
      });
    }
  }

  if (typeof payload.music_info === "object" && payload.music_info !== null) {
    const mi = payload.music_info as Record<string, unknown>;
    const miUrl =
      typeof mi.play === "string"
        ? mi.play
        : typeof mi.playUrl === "string"
          ? mi.playUrl
          : typeof mi.url === "string"
            ? mi.url
            : null;
    if (miUrl) {
      addItem({
        format: "mp3",
        hasAudio: true,
        headers: videoHeaders,
        quality: "Audio (MP3)",
        url: miUrl
      });
    }
  }

  if (typeof payload.audio === "string" && payload.audio.startsWith("http")) {
    addItem({
      format: "mp3",
      hasAudio: true,
      quality: "Audio (MP3)",
      url: payload.audio
    });
  } else if (typeof payload.audio === "object" && payload.audio !== null) {
    const a = payload.audio as Record<string, unknown>;
    const aUrl =
      typeof a.url === "string"
        ? a.url
        : typeof a.playUrl === "string"
          ? a.playUrl
          : typeof a.play === "string"
            ? a.play
            : null;
    if (aUrl) {
      addItem({
        format: "mp3",
        hasAudio: true,
        quality: "Audio (MP3)",
        url: aUrl
      });
    }
  }

  if (typeof payload.audio_url === "string" && payload.audio_url.startsWith("http")) {
    addItem({
      format: "mp3",
      hasAudio: true,
      quality: "Audio (MP3)",
      url: payload.audio_url
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

    // Determine if endpoint prefers GET (kyzzz, jerexd, standard REST download query APIs)
    const prefersGet =
      parsedBaseUrl.hostname.includes("kyzzz.xyz") ||
      parsedBaseUrl.hostname.includes("jerexd.my.id") ||
      parsedBaseUrl.pathname.includes("/api/download/") ||
      parsedBaseUrl.pathname.includes("/api/downloader/") ||
      parsedBaseUrl.searchParams.has("url");

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

    // Check nested result errors (e.g. Jerexd/FastDL returning code: "URL_IS_EMPTY" or error inside result)
    if (typeof payload.result === "object" && payload.result !== null && !Array.isArray(payload.result)) {
      const resObj = payload.result as Record<string, unknown>;
      if (resObj.code === "URL_IS_EMPTY") {
        throw new AppError("PROVIDER_ERROR", "Provider downloader tidak dapat memproses URL ini atau format URL belum didukung upstream provider.", 422);
      }
      if (resObj.status === false && typeof resObj.message === "string") {
        throw new AppError("PROVIDER_ERROR", resObj.message, 422);
      }
      if (typeof resObj.error === "string" && resObj.error.trim().length > 0) {
        throw new AppError("PROVIDER_ERROR", resObj.error.trim(), 422);
      }
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
    } else if (typeof rootData.channel === "string" && rootData.channel.trim().length > 0) {
      author = rootData.channel.trim();
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
