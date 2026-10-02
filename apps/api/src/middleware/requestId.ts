import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

declare module "fastify" {
  interface FastifyRequest {
    publicRequestId: string;
  }
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function normalizeRequestId(value: string | string[] | undefined): string {
  const requestId = Array.isArray(value) ? value[0] : value;

  return requestId !== undefined && REQUEST_ID_PATTERN.test(requestId) ? requestId : randomUUID();
}

export async function registerRequestId(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    const requestId = normalizeRequestId(request.headers["x-request-id"]);

    request.publicRequestId = requestId;
    reply.header("x-request-id", requestId);
  });
}
