import Fastify from "fastify";
import { registerCors } from "./config/cors.js";
import { registerHelmet } from "./config/helmet.js";
import { errorHandler } from "./errors/errorHandler.js";
import { logger, safeRequestPath } from "./logger/logger.js";
import { registerMaintenanceCheck } from "./middleware/maintenanceCheck.js";
import { registerRateLimiter } from "./middleware/rateLimiter.js";
import { registerRequestId } from "./middleware/requestId.js";
import { registerRoutes } from "./routes/index.js";
import type { AdminAuthProvider } from "./auth/adminAuthProvider.js";
import type { DnsAddress } from "@vidsaveid/security";
import type { ApiRepositories } from "./repositories/index.js";
import type { ProviderAdapter } from "./providers/providerAdapter.js";

export interface BuildAppOptions {
  logger?: boolean | typeof logger;
  repositories?: ApiRepositories;
  adminAuthProvider?: AdminAuthProvider;
  ssrfResolveHostname?: (hostname: string) => Promise<readonly DnsAddress[]>;
  providerAdapter?: ProviderAdapter;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const requestStartTimes = new WeakMap<object, number>();
  const app = Fastify({
    disableRequestLogging: true,
    logger: options.logger ?? logger
  });

  app.setErrorHandler(errorHandler);
  app.addHook("onRequest", (request, _reply, done) => {
    requestStartTimes.set(request, Date.now());
    request.log.info(
      {
        req: {
          method: request.method,
          path: safeRequestPath(request.url),
          hostname: request.hostname,
          remoteAddress: request.ip
        }
      },
      "incoming request"
    );
    done();
  });
  app.addHook("onResponse", (request, reply, done) => {
    const startedAt = requestStartTimes.get(request) ?? Date.now();

    request.log.info(
      {
        req: {
          method: request.method,
          path: safeRequestPath(request.url),
          hostname: request.hostname,
          remoteAddress: request.ip
        },
        res: {
          statusCode: reply.statusCode
        },
        responseTime: Date.now() - startedAt
      },
      "request completed"
    );
    done();
  });

  await registerRequestId(app);
  await registerCors(app);
  await registerHelmet(app);
  await registerRateLimiter(app);
  await registerMaintenanceCheck(app);
  const routeOptions = {
    ...(options.repositories ? { repositories: options.repositories } : {}),
    ...(options.adminAuthProvider ? { adminAuthProvider: options.adminAuthProvider } : {}),
    ...(options.ssrfResolveHostname ? { ssrfResolveHostname: options.ssrfResolveHostname } : {}),
    ...(options.providerAdapter ? { providerAdapter: options.providerAdapter } : {})
  };

  await registerRoutes(app, routeOptions);

  return app;
}
