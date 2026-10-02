import { env } from "../config/env.js";

export function safeRequestPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  const path = value.split("?")[0] ?? "/";
  return path.startsWith("/") ? path : undefined;
}

export const logger = {
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.apiKey", "*.url"],
    remove: true
  }
};
