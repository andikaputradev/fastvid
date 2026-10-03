import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import type { AdminIdentity } from "./adminAuthProvider.js";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const sessionPayloadSchema = z.object({
  adminUserId: z.string().uuid(),
  adminEmailHash: z.string().length(64),
  role: z.literal("admin"),
  csrfToken: z.string().min(32),
  expiresAt: z.number().int().positive()
});

export const ADMIN_SESSION_COOKIE_NAME =
  env.NODE_ENV === "production" ? "__Host-fastvid_admin_session" : "fastvid_admin_session";
export const ADMIN_CSRF_COOKIE_NAME = "fastvid_admin_csrf";
export const LEGACY_ADMIN_SESSION_COOKIE_NAME =
  env.NODE_ENV === "production" ? "__Host-vidsaveid_admin_session" : "vidsaveid_admin_session";
export const LEGACY_ADMIN_CSRF_COOKIE_NAME = "vidsaveid_admin_csrf";

export type AdminSession = z.infer<typeof sessionPayloadSchema>;

export interface CreatedAdminSession {
  session: AdminSession;
  token: string;
}

export interface CookieOptions {
  domain?: string;
  httpOnly?: boolean;
  maxAgeSeconds?: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", env.ADMIN_SESSION_SECRET).update(value).digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.byteLength === rightBuffer.byteLength && timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function hashAdminEmail(email: string): string {
  return createHmac("sha256", env.IP_HASH_SECRET)
    .update("fastvid:admin_email:")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function createAdminSession(admin: AdminIdentity): CreatedAdminSession {
  const session: AdminSession = {
    adminUserId: admin.id,
    adminEmailHash: admin.emailHash,
    role: admin.role,
    csrfToken: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(session));
  const signature = sign(encodedPayload);

  return {
    session,
    token: `${encodedPayload}.${signature}`
  };
}

export function verifyAdminSessionToken(token: string | undefined): AdminSession | null {
  if (token === undefined || token.length === 0) {
    return null;
  }

  const [encodedPayload, signature, extra] = token.split(".");

  if (encodedPayload === undefined || signature === undefined || extra !== undefined) {
    return null;
  }

  if (!constantTimeEqual(sign(encodedPayload), signature)) {
    return null;
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  const parsedSession = sessionPayloadSchema.safeParse(parsedPayload);

  if (!parsedSession.success || parsedSession.data.expiresAt <= Date.now()) {
    return null;
  }

  return parsedSession.data;
}

export function parseCookieHeader(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();

  if (cookieHeader === undefined || cookieHeader.trim().length === 0) {
    return cookies;
  }

  for (const pair of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = pair.trim().split("=");

    if (rawName === undefined || rawName.length === 0) {
      continue;
    }

    try {
      cookies.set(rawName, decodeURIComponent(rawValue.join("=")));
    } catch {
      continue;
    }
  }

  return cookies;
}

export function defaultCookieDomain(): string | undefined {
  if (env.COOKIE_DOMAIN !== undefined && env.COOKIE_DOMAIN.length > 0) {
    return env.COOKIE_DOMAIN;
  }

  if (env.NODE_ENV === "production") {
    for (const rawOrigin of env.WEB_ORIGIN.split(",")) {
      try {
        const hostname = new URL(rawOrigin.trim()).hostname;
        if (hostname === "fastvid.my.id" || hostname === "www.fastvid.my.id") {
          return "fastvid.my.id";
        }
      } catch {
        // ignore invalid URL
      }
    }
  }

  return undefined;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"];

  if (options.domain !== undefined && options.domain.length > 0) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  if (options.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  return parts.join("; ");
}

export function clearCookie(name: string, options: CookieOptions = {}): string {
  const domain =
    options.domain ??
    (name === ADMIN_CSRF_COOKIE_NAME || name === LEGACY_ADMIN_CSRF_COOKIE_NAME
      ? defaultCookieDomain()
      : undefined);

  return serializeCookie(name, "", {
    ...options,
    ...(domain !== undefined ? { domain } : {}),
    maxAgeSeconds: 0
  });
}

export function sessionCookie(token: string): string {
  return serializeCookie(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS
  });
}

export function csrfCookie(csrfToken: string): string {
  const domain = defaultCookieDomain();

  return serializeCookie(ADMIN_CSRF_COOKIE_NAME, csrfToken, {
    ...(domain !== undefined ? { domain } : {}),
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS
  });
}
