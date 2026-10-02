import type { PlatformId } from "./platform.types.js";

export type ProviderStatus = "inactive" | "active" | "maintenance";

export interface ProviderDescriptor {
  id: string;
  platformId: PlatformId;
  name: string;
  status: ProviderStatus;
  requiresApiKey: boolean;
}
