import type { FastifyInstance } from "fastify";

export async function registerRateLimiter(_app: FastifyInstance) {
  void _app;
}

export function enforcePublicDownloadRateLimit(): Promise<void> {
  return Promise.resolve();
}
