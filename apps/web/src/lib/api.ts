import type { PublicAdSlot, PublicCustomAd } from "@vidsaveid/shared";
import { readPublicEnv } from "./env";

export type { PublicAdSlot, PublicCustomAd };

export const API_BASE_URL = readPublicEnv("VITE_API_BASE_URL", "http://localhost:4000");

export class PublicApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PublicApiError";
    this.code = code;
    this.status = status;
  }
}

interface ApiSuccess<TData> {
  success: true;
  data: TData;
}

interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
}

type ApiEnvelope<TData> = ApiFailure | ApiSuccess<TData>;

export interface PublicSiteStatus {
  maintenanceMessage?: string;
  maintenanceMode: boolean;
  siteName: string;
  siteTitle: string;
  status: string;
  tagline: string;
}

export interface PublicPlatform {
  description: string | null;
  iconUrl: string | null;
  name: string;
  slug: string;
  status: "active" | "inactive" | "maintenance";
}

export interface DownloadRequest {
  turnstileToken?: string;
  url: string;
}

export interface DownloadMediaItem {
  format: "mp4" | "mp3" | "webm" | "image" | string;
  hasAudio?: boolean | undefined;
  quality: string;
  sizeBytes?: number | undefined;
  url: string;
}

export interface DownloadResponse {
  author?: string | null | undefined;
  code?: string | undefined;
  duration?: number | null | undefined;
  media?: DownloadMediaItem[] | undefined;
  message?: string | undefined;
  platform?: string | undefined;
  status?: string | undefined;
  thumbnailUrl?: string | null | undefined;
  title?: string | undefined;
}

function isApiFailure(payload: unknown): payload is ApiFailure {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    (payload as { success: unknown }).success === false
  );
}

function publicErrorMessage(code: string, fallback: string): string {
  if (code === "PROVIDER_NOT_IMPLEMENTED") {
    return "Platform valid, tetapi provider download belum aktif.";
  }

  if (code === "PLATFORM_INACTIVE") {
    return "Platform ini belum aktif.";
  }

  if (
    code === "BLOCKED_DOMAIN" ||
    code === "BLOCKED_URL_PATTERN" ||
    code === "INVALID_URL" ||
    code === "UNSUPPORTED_DOMAIN" ||
    code === "VALIDATION_FAILED"
  ) {
    return "Link tidak dapat diproses. Pastikan link bersifat publik dan platform didukung.";
  }

  return fallback || "Permintaan tidak dapat diproses saat ini.";
}

async function request<TData>(path: string, init?: RequestInit): Promise<TData> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "content-type": "application/json",
        ...init?.headers
      },
      ...init
    });
  } catch {
    throw new PublicApiError("NETWORK_ERROR", "Tidak dapat terhubung ke API.", 0);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new PublicApiError("INVALID_RESPONSE", "Respons API tidak valid.", response.status);
  }

  if (!response.ok || isApiFailure(payload)) {
    const error = isApiFailure(payload) ? payload.error : null;
    const code = error?.code ?? "REQUEST_FAILED";

    throw new PublicApiError(code, publicErrorMessage(code, error?.message ?? ""), response.status);
  }

  return (payload as ApiEnvelope<TData> & { success: true }).data;
}

export const api = {
  getStatus: () => request<PublicSiteStatus>("/api/v1/status"),
  getPlatforms: () => request<{ platforms: PublicPlatform[] }>("/api/v1/platforms"),
  getAds: () => request<{ ads: PublicAdSlot[] }>("/api/v1/ads"),
  requestDownload: (body: DownloadRequest) =>
    request<DownloadResponse>("/api/v1/download", {
      body: JSON.stringify(body),
      method: "POST"
    })
};
