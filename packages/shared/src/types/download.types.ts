import type { PlatformId } from "./platform.types.js";

export type DownloadStatus =
  | "ready"
  | "provider_not_implemented"
  | "validation_failed"
  | "blocked"
  | "failed";

export interface DownloadMediaItem {
  quality: string;
  format: "mp4" | "mp3" | "webm" | "image" | string;
  url: string;
  sizeBytes?: number | undefined;
  hasAudio?: boolean | undefined;
}

export interface DownloadResultData {
  title: string;
  thumbnailUrl?: string | null | undefined;
  duration?: number | null | undefined;
  platform: string;
  author?: string | null | undefined;
  media: DownloadMediaItem[];
}

export interface DownloadRequest {
  url: string;
  platformId?: PlatformId | undefined;
  turnstileToken?: string | undefined;
}

export interface DownloadResponse {
  status?: DownloadStatus | string | undefined;
  code: string;
  message: string;
  data?: DownloadResultData | undefined;
}
