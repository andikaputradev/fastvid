import { getSiteBaseUrl } from "./env";

export const siteName = "FastVid";
export const defaultSeoTitle = "FastVid - Download Video Sosmed Tanpa Login";
export const defaultTagline = "Simpan video publik dari berbagai platform dengan cepat, aman, dan praktis.";

export function siteUrl(): string {
  return getSiteBaseUrl();
}

export function canonicalUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl(),
    description: defaultTagline
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl()
  };
}

export function webApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    applicationCategory: "UtilitiesApplication",
    name: siteName,
    operatingSystem: "All",
    url: siteUrl(),
    description: defaultTagline,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    },
    featureList: [
      "Download video TikTok tanpa watermark",
      "Download Instagram Reels & Video",
      "Download YouTube Shorts & Video",
      "Download Facebook Video",
      "Download Twitter / X Video",
      "Ekstrak audio MP3 dari video"
    ]
  };
}

export function faqJsonLd(items: Array<{ answer: string; question: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function howToJsonLd(name: string, description: string, steps: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: `Langkah ${index + 1}`,
      text: step
    }))
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path)
    }))
  };
}
