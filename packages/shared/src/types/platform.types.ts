export type PlatformStatus = "inactive" | "active" | "maintenance";

export type PlatformId = "instagram" | "tiktok" | "facebook" | "x" | "youtube" | "threads";

export interface SocialPlatform {
  id: PlatformId;
  name: string;
  hostnames: string[];
  status: PlatformStatus;
  publicOnly: boolean;
}
