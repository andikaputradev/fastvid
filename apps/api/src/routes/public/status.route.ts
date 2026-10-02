import type { FastifyInstance } from "fastify";
import { createStatusHandler } from "../../handlers/public/status.handler.js";
import type { ApiRepositories } from "../../repositories/index.js";

export interface StatusRouteOptions {
  repositories?: ApiRepositories;
}

export async function statusRoute(app: FastifyInstance, options: StatusRouteOptions = {}) {
  app.get("/status", createStatusHandler(options.repositories));
}
