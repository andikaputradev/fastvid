import type { FastifyInstance } from "fastify";
import { createDownloadHandler, type DownloadHandlerOptions } from "../../handlers/public/download.handler.js";
import { createDownloadStreamHandler } from "../../handlers/public/stream.handler.js";

export async function downloadRoute(app: FastifyInstance, options: DownloadHandlerOptions = {}) {
  const handler = createDownloadHandler(options);
  const streamHandler = createDownloadStreamHandler({
    ssrfResolveHostname: options.ssrfResolveHostname
  });

  app.route({
    method: ["GET", "POST"],
    url: "/download",
    handler
  });

  app.route({
    method: "GET",
    url: "/download/stream",
    handler: streamHandler
  });
}
