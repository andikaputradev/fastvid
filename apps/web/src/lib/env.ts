export function getApiBaseUrl(): string {
  const envUrl = typeof import.meta.env !== "undefined" ? import.meta.env.VITE_API_BASE_URL : undefined;
  const isProd = typeof import.meta.env !== "undefined" ? import.meta.env.PROD : process.env?.NODE_ENV === "production";

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname === "fastvid.my.id" || hostname.endsWith(".fastvid.my.id")) {
      if (typeof envUrl === "string" && envUrl.length > 0 && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        return envUrl.replace(/\/+$/, "");
      }
      return "https://api.fastvid.my.id";
    }

    if (typeof envUrl === "string" && envUrl.length > 0) {
      return envUrl.replace(/\/+$/, "");
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000";
    }

    if (isProd) {
      return "https://api.fastvid.my.id";
    }
  }

  if (typeof process !== "undefined" && typeof process.env?.VITE_API_BASE_URL === "string" && process.env.VITE_API_BASE_URL.length > 0) {
    return process.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  }

  if (typeof envUrl === "string" && envUrl.length > 0) {
    return envUrl.replace(/\/+$/, "");
  }

  if (isProd) {
    return "https://api.fastvid.my.id";
  }

  return "http://localhost:4000";
}

export function getSiteBaseUrl(): string {
  const envUrl = typeof import.meta.env !== "undefined" ? import.meta.env.VITE_SITE_URL : undefined;

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin.replace(/\/+$/, "");
    }
  }

  if (typeof process !== "undefined" && typeof process.env?.VITE_SITE_URL === "string" && process.env.VITE_SITE_URL.length > 0) {
    return process.env.VITE_SITE_URL.replace(/\/+$/, "");
  }

  if (typeof envUrl === "string" && envUrl.length > 0) {
    return envUrl.replace(/\/+$/, "");
  }

  return "https://fastvid.my.id";
}

export function readPublicEnv(name: string, fallback: string): string {
  if (name === "VITE_API_BASE_URL") {
    return getApiBaseUrl();
  }

  if (name === "VITE_SITE_URL") {
    return getSiteBaseUrl();
  }

  if (typeof process !== "undefined" && process.env[name]) {
    return process.env[name];
  }

  return fallback;
}

