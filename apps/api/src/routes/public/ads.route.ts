import type { FastifyInstance } from "fastify";
import { createAdsHandler } from "../../handlers/public/ads.handler.js";
import type { ApiRepositories } from "../../repositories/index.js";

export interface AdsRouteOptions {
  repositories?: ApiRepositories;
}

export async function adsRoute(app: FastifyInstance, options: AdsRouteOptions = {}) {
  app.get("/ads", createAdsHandler(options.repositories));
}
