import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import {
  ADMIN_CSRF_COOKIE_NAME,
  LEGACY_ADMIN_CSRF_COOKIE_NAME,
  parseCookieHeader
} from "../auth/adminSession.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function createRequireCsrfToken() {
  return async function requireCsrfToken(request: FastifyRequest, _reply: FastifyReply) {
    if (SAFE_METHODS.has(request.method)) {
      return;
    }

    const csrfHeader = request.headers["x-csrf-token"];
    const headerValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;
    const cookies = parseCookieHeader(request.headers.cookie);
    const cookieValue = cookies.get(ADMIN_CSRF_COOKIE_NAME) ?? cookies.get(LEGACY_ADMIN_CSRF_COOKIE_NAME);

    if (
      request.admin === undefined ||
      headerValue === undefined ||
      cookieValue === undefined ||
      headerValue.length === 0 ||
      headerValue !== cookieValue ||
      headerValue !== request.admin.csrfToken
    ) {
      throw new AppError("FORBIDDEN", "CSRF token is invalid.", 403);
    }
  };
}

export const requireCsrfToken = createRequireCsrfToken();
