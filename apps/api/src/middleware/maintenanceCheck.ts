import type { FastifyInstance } from "fastify";

export async function registerMaintenanceCheck(_app: FastifyInstance) {
  void _app;
}

export function ensurePublicDownloadAvailable(): Promise<void> {
  return Promise.resolve();
}
