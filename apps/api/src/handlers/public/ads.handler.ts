import type { FastifyReply, FastifyRequest } from "fastify";
import { createDefaultRepositories, type ApiRepositories } from "../../repositories/index.js";

export function createAdsHandler(repositories?: ApiRepositories) {
  return async function getAdsHandler(_request: FastifyRequest, reply: FastifyReply) {
    const activeRepositories = repositories ?? createDefaultRepositories();
    const ads = await activeRepositories.settings.getActiveAds();

    return reply.send({
      success: true,
      data: {
        ads
      }
    });
  };
}
