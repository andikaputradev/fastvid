import type { FastifyInstance } from "fastify";
import { createPlatformsHandler } from "../../handlers/public/platforms.handler.js";
import type { ApiRepositories } from "../../repositories/index.js";

export interface PlatformsRouteOptions {
  repositories?: ApiRepositories;
}

export async function platformsRoute(app: FastifyInstance, options: PlatformsRouteOptions = {}) {
  app.get("/platforms", createPlatformsHandler(options.repositories));
}
