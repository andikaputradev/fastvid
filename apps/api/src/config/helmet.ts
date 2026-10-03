import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";

export async function registerHelmet(app: FastifyInstance) {
  await app.register(helmet, {
    global: true,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });
}
