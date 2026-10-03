import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl, getSiteBaseUrl, readPublicEnv } from "./env";

describe("env configuration helpers", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation
    });
    vi.unstubAllEnvs();
  });

  it("resolves production API URL when hosted on fastvid.my.id domain", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "fastvid.my.id",
        origin: "https://fastvid.my.id"
      }
    });

    expect(getApiBaseUrl()).toBe("https://api.fastvid.my.id");
  });

  it("resolves production API URL when hosted on www.fastvid.my.id subdomain", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "www.fastvid.my.id",
        origin: "https://www.fastvid.my.id"
      }
    });

    expect(getApiBaseUrl()).toBe("https://api.fastvid.my.id");
  });

  it("resolves localhost API URL when running locally without explicit env var", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "localhost",
        origin: "http://localhost:5173"
      }
    });

    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });

  it("resolves explicit API URL when configured", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://custom-api.example.com");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "localhost",
        origin: "http://localhost:5173"
      }
    });

    expect(getApiBaseUrl()).toBe("https://custom-api.example.com");
  });

  it("resolves site URL correctly and falls back to production domain", () => {
    expect(getSiteBaseUrl()).toBe("https://fastvid.my.id");
  });

  it("readPublicEnv routes known keys and uses fallback for unknown keys", () => {
    expect(readPublicEnv("UNKNOWN_KEY", "default-val")).toBe("default-val");
    expect(readPublicEnv("VITE_SITE_URL", "fallback")).toBe(getSiteBaseUrl());
    expect(readPublicEnv("VITE_API_BASE_URL", "fallback")).toBe(getApiBaseUrl());
  });
});
