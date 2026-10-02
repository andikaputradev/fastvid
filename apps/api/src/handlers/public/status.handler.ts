import type { FastifyReply, FastifyRequest } from "fastify";
import { createDefaultRepositories, type ApiRepositories } from "../../repositories/index.js";

export function createStatusHandler(repositories?: ApiRepositories) {
  return async function getStatusHandler(_request: FastifyRequest, reply: FastifyReply) {
    const activeRepositories = repositories ?? createDefaultRepositories();
    const settings = await activeRepositories.settings.getPublicSettings();
    const response = {
      siteName: settings.siteName,
      siteTitle: settings.siteTitle,
      tagline: settings.tagline,
      maintenanceMode: settings.maintenanceMode,
      ...(settings.maintenanceMode && settings.maintenanceMessage ? { maintenanceMessage: settings.maintenanceMessage } : {}),
      status: settings.status
    };

    return reply.send({
      success: true,
      data: response
    });
  };
}
