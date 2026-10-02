export interface PublicSiteSettings {
  siteName: string;
  tagline: string;
  maintenanceMode: boolean;
  defaultSeoTitle: string;
}

export interface PublicCustomAd {
  imageUrl: string;
  targetUrl: string;
  altText: string;
}

export interface PublicAdSlot {
  slotKey: string;
  providerName: string | null;
  adType: "code" | "custom";
  adCode: string | null;
  customAd: PublicCustomAd | null;
}

