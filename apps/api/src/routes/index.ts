import type { FastifyInstance } from "fastify";
import { adminAuthRoute } from "./admin/auth.route.js";
import { adminCrudRoute } from "./admin/crud.route.js";
import { healthRoute } from "./internal/health.route.js";
import { adsRoute } from "./public/ads.route.js";
import { downloadRoute } from "./public/download.route.js";
import { platformsRoute } from "./public/platforms.route.js";
import { statusRoute } from "./public/status.route.js";
import type { AdminAuthProvider } from "../auth/adminAuthProvider.js";
import type { DnsAddress } from "@vidsaveid/security";
import type { ApiRepositories } from "../repositories/index.js";

export interface ApiRouteOptions {
  repositories?: ApiRepositories;
  adminAuthProvider?: AdminAuthProvider;
  ssrfResolveHostname?: (hostname: string) => Promise<readonly DnsAddress[]>;
}

export async function registerRoutes(app: FastifyInstance, options: ApiRouteOptions = {}) {
  await app.register(healthRoute);
  await app.register(statusRoute, {
    prefix: "/api/v1",
    ...(options.repositories ? { repositories: options.repositories } : {})
  });
  await app.register(platformsRoute, {
    prefix: "/api/v1",
    ...(options.repositories ? { repositories: options.repositories } : {})
  });
  await app.register(adsRoute, {
    prefix: "/api/v1",
    ...(options.repositories ? { repositories: options.repositories } : {})
  });
  const downloadRouteOptions = options.ssrfResolveHostname
    ? {
        prefix: "/api/v1",
        ...(options.repositories ? { repositories: options.repositories } : {}),
        ssrfResolveHostname: options.ssrfResolveHostname
      }
    : {
        prefix: "/api/v1",
        ...(options.repositories ? { repositories: options.repositories } : {})
      };

  await app.register(downloadRoute, downloadRouteOptions);
  await app.register(adminAuthRoute, {
    prefix: "/api/v1/admin",
    ...(options.repositories ? { repositories: options.repositories } : {}),
    ...(options.adminAuthProvider ? { adminAuthProvider: options.adminAuthProvider } : {})
  });
  await app.register(adminCrudRoute, {
    prefix: "/api/v1/admin",
    ...(options.repositories ? { repositories: options.repositories } : {})
  });
}
