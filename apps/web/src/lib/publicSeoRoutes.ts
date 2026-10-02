import {
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organizationJsonLd,
  webApplicationJsonLd,
  websiteJsonLd
} from "./seo";
import { allPublicSeoContentPages, homeSeoContent, platformsSeoContent, seoContentPages } from "./seoContent";
import type { SeoContentPage, SeoFaqItem } from "./seoContent";

export interface PublicSeoRoute {
  content?: SeoContentPage;
  description: string;
  faq: SeoFaqItem[];
  h1: string;
  jsonLd?: () => Record<string, unknown> | Array<Record<string, unknown>>;
  path: string;
  title: string;
}

const staticPublicSeoRoutes: PublicSeoRoute[] = [
  {
    content: homeSeoContent,
    path: homeSeoContent.path,
    title: homeSeoContent.title,
    description: homeSeoContent.metaDescription,
    h1: homeSeoContent.h1,
    faq: homeSeoContent.faq,
    jsonLd: () => [
      websiteJsonLd(),
      organizationJsonLd(),
      webApplicationJsonLd(),
      faqJsonLd(homeSeoContent.faq),
      howToJsonLd("Cara Download Video Sosmed dengan FastVid", homeSeoContent.intro, homeSeoContent.howToSteps)
    ]
  },
  {
    content: platformsSeoContent,
    path: platformsSeoContent.path,
    title: platformsSeoContent.title,
    description: platformsSeoContent.metaDescription,
    h1: platformsSeoContent.h1,
    faq: platformsSeoContent.faq,
    jsonLd: () => jsonLdForContentPage(platformsSeoContent)
  },
  {
    path: "/terms",
    title: "Ketentuan Layanan - FastVid",
    description: "Baca ketentuan layanan FastVid untuk penggunaan konten publik yang aman dan patuh.",
    h1: "Ketentuan Layanan",
    faq: []
  },
  {
    path: "/privacy",
    title: "Kebijakan Privasi - FastVid",
    description: "Pelajari cara FastVid merancang perlindungan privasi untuk URL, IP, User-Agent, dan API key.",
    h1: "Kebijakan Privasi",
    faq: []
  },
  {
    path: "/dmca",
    title: "DMCA - FastVid",
    description: "Informasi proses permintaan hak cipta dan verifikasi resmi untuk FastVid.",
    h1: "DMCA",
    faq: []
  },
  {
    path: "/contact",
    title: "Kontak - FastVid",
    description: "Informasi kanal kontak resmi FastVid by Wahyu Andika Putra.",
    h1: "Kontak",
    faq: []
  },
  {
    path: "/about",
    title: "Tentang - FastVid",
    description: "Tentang FastVid by Wahyu Andika Putra, layanan validasi link video publik tanpa login.",
    h1: "FastVid",
    faq: []
  }
];

function jsonLdForContentPage(page: SeoContentPage): Record<string, unknown> | Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];

  if (page.jsonLd.faq && page.faq.length > 0) {
    items.push(faqJsonLd(page.faq));
  }

  if (page.jsonLd.breadcrumb) {
    items.push(
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: page.h1, path: page.path }
      ])
    );
  }

  if (items.length === 1) {
    const [item] = items;

    if (item) {
      return item;
    }
  }

  return items;
}

const contentSeoRoutes: PublicSeoRoute[] = seoContentPages.map((config) => ({
  content: config,
  path: config.path,
  title: config.title,
  description: config.metaDescription,
  h1: config.h1,
  faq: config.faq,
  jsonLd: () => jsonLdForContentPage(config)
}));

export const publicSeoRoutes: PublicSeoRoute[] = [
  ...staticPublicSeoRoutes.slice(0, 2),
  ...contentSeoRoutes,
  ...staticPublicSeoRoutes.slice(2)
];

const publicContentPathSet = new Set(allPublicSeoContentPages.map((page) => page.path));

export function isPublicContentRoute(path: string): boolean {
  return publicContentPathSet.has(path);
}

export function getPublicSeoRoute(path: string): PublicSeoRoute {
  const route = publicSeoRoutes.find((item) => item.path === path);

  if (!route) {
    throw new Error(`Unknown public SEO route: ${path}`);
  }

  return route;
}
