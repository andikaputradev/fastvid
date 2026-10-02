import { useEffect } from "react";
import { siteUrl } from "../../lib/seo";

const defaultTitle = "VidSaveID - Download Video Sosmed Tanpa Login";
const defaultDescription = "Simpan video publik dari berbagai platform dengan cepat, aman, dan praktis.";
const defaultImage = "/og-image.png";

interface MetaTagsProps {
  canonical?: string;
  description?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  openGraph?: {
    description?: string;
    image?: string;
    title?: string;
  };
  robots?: string;
  title?: string;
}

function absoluteUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${siteUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}

function ensureMeta(selector: string, attr: "name" | "property", key: string): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>(selector);

  if (meta === null) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }

  return meta;
}

function setMetaName(name: string, content: string): void {
  ensureMeta(`meta[name='${name}']`, "name", name).setAttribute("content", content);
}

function setMetaProperty(property: string, content: string): void {
  ensureMeta(`meta[property='${property}']`, "property", property).setAttribute("content", content);
}

export function MetaTags({
  canonical,
  description = defaultDescription,
  jsonLd,
  openGraph,
  robots = "index,follow",
  title = defaultTitle
}: MetaTagsProps) {
  useEffect(() => {
    document.title = title;
    setMetaName("description", description);
    setMetaName("robots", robots);
    setMetaProperty("og:type", "website");
    setMetaProperty("og:title", openGraph?.title ?? title);
    setMetaProperty("og:description", openGraph?.description ?? description);
    setMetaProperty("og:image", absoluteUrl(openGraph?.image ?? defaultImage));
    setMetaName("twitter:card", "summary_large_image");
    setMetaName("twitter:title", openGraph?.title ?? title);
    setMetaName("twitter:description", openGraph?.description ?? description);
    setMetaName("twitter:image", absoluteUrl(openGraph?.image ?? defaultImage));

    const canonicalUrl = canonical ?? `${siteUrl()}${window.location.pathname}`;
    let canonicalLink = document.querySelector<HTMLLinkElement>("link[rel='canonical']");

    if (canonicalLink === null) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }

    canonicalLink.setAttribute("href", absoluteUrl(canonicalUrl));

    document.querySelectorAll("script[data-vidsaveid-jsonld='true']").forEach((script) => script.remove());

    if (jsonLd !== undefined) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.vidsaveidJsonld = "true";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [canonical, description, jsonLd, openGraph, robots, title]);

  return null;
}
