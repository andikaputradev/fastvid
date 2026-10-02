import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function loopbackAlias(hostname: string): string {
  return hostname === "localhost" ? "127.0.0.1" : "localhost";
}

function originWithHostname(origin: URL, hostname: string): string {
  const port = origin.port.length > 0 ? `:${origin.port}` : "";

  return `${origin.protocol}//${hostname}${port}`;
}

export function allowedCorsOrigins(webOrigin: string, nodeEnv: string): Set<string> {
  const rawOrigins = webOrigin.split(",").map((item) => item.trim()).filter(Boolean);
  const origins = new Set<string>();

  for (const origin of rawOrigins) {
    origins.add(origin);
    try {
      const parsedOrigin = new URL(origin);
      if (isLoopbackHost(parsedOrigin.hostname)) {
        origins.add(originWithHostname(parsedOrigin, loopbackAlias(parsedOrigin.hostname)));
      }
    } catch {
      // Ignore invalid URL
    }
  }

  if (nodeEnv !== "production") {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:4173");
    origins.add("http://127.0.0.1:4173");
  }

  return origins;
}

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (origin === undefined) {
    return true;
  }

  return allowedCorsOrigins(env.WEB_ORIGIN, env.NODE_ENV).has(origin);
}

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin(origin, callback) {
      callback(null, isCorsOriginAllowed(origin));
    },
    credentials: true,
    methods: ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
  });
}
