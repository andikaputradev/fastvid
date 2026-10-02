import { platformSeoPages } from "./seoContent";
import type { SeoContentPage, SeoFaqItem } from "./seoContent";

export type SeoLandingPageConfig = SeoContentPage;

export const landingPages: SeoLandingPageConfig[] = platformSeoPages;

export function landingPageFaqItems(config: SeoLandingPageConfig): SeoFaqItem[] {
  return config.faq;
}
