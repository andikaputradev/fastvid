import type { FastifyReply, FastifyRequest } from "fastify";
import { createDefaultRepositories, type ApiRepositories } from "../../repositories/index.js";

export function createPlatformsHandler(repositories?: ApiRepositories) {
  return async function getPlatformsHandler(_request: FastifyRequest, reply: FastifyReply) {
    const activeRepositories = repositories ?? createDefaultRepositories();
    const platforms = await activeRepositories.platforms.getActivePlatforms();

    return reply.send({
      success: true,
      data: {
        platforms
      }
    });
  };
}
