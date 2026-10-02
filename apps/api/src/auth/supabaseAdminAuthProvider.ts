import { env } from "../config/env.js";
import { hashAdminEmail } from "./adminSession.js";
import {
  AdminAuthError,
  type AdminAuthProvider,
  type AdminIdentity,
  type AdminLoginCredentials
} from "./adminAuthProvider.js";

interface SupabaseAuthUser {
  id: string;
  email?: string;
  app_metadata?: {
    role?: unknown;
  };
}

export interface SupabasePasswordAuthResult {
  user: SupabaseAuthUser | null;
}

export interface SupabaseAdminAuthClient {
  signInWithPassword(credentials: AdminLoginCredentials): Promise<SupabasePasswordAuthResult>;
}

export interface FetchSupabaseAuthClientOptions {
  anonKey: string;
  fetchImpl?: typeof fetch;
  supabaseUrl: string;
}

export interface SupabaseAdminAuthProviderOptions {
  client?: SupabaseAdminAuthClient;
}

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/+$/u, "");
}

function isAdminUser(user: SupabaseAuthUser): boolean {
  return user.app_metadata?.role === "admin";
}

function createUnavailableClient(): SupabaseAdminAuthClient {
  return {
    async signInWithPassword() {
      throw new AdminAuthError("AUTH_UNAVAILABLE");
    }
  };
}

function parseSupabaseUser(value: unknown): SupabaseAuthUser | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== "string" || record.id.length === 0) {
    return null;
  }

  const user: SupabaseAuthUser = {
    id: record.id
  };

  if (typeof record.email === "string") {
    user.email = record.email;
  }

  if (typeof record.app_metadata === "object" && record.app_metadata !== null) {
    user.app_metadata = record.app_metadata as { role?: unknown };
  }

  return user;
}

export function createFetchSupabaseAuthClient(
  options: FetchSupabaseAuthClientOptions
): SupabaseAdminAuthClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const authUrl = `${normalizeSupabaseUrl(options.supabaseUrl)}/auth/v1/token?grant_type=password`;

  return {
    async signInWithPassword(credentials) {
      let response: Response;

      try {
        response = await fetchImpl(authUrl, {
          method: "POST",
          headers: {
            apikey: options.anonKey,
            authorization: `Bearer ${options.anonKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          })
        });
      } catch {
        throw new AdminAuthError("AUTH_UNAVAILABLE");
      }

      if (response.status === 400 || response.status === 401) {
        throw new AdminAuthError("INVALID_CREDENTIALS");
      }

      if (!response.ok) {
        throw new AdminAuthError("AUTH_UNAVAILABLE");
      }

      const body = (await response.json().catch(() => null)) as unknown;

      if (typeof body !== "object" || body === null) {
        throw new AdminAuthError("AUTH_UNAVAILABLE");
      }

      return {
        user: parseSupabaseUser((body as Record<string, unknown>).user)
      };
    }
  };
}

export function createSupabaseAdminAuthProvider(
  options: SupabaseAdminAuthProviderOptions = {}
): AdminAuthProvider {
  const client =
    options.client ??
    (env.SUPABASE_URL !== undefined && env.SUPABASE_ANON_KEY !== undefined
      ? createFetchSupabaseAuthClient({
          supabaseUrl: env.SUPABASE_URL,
          anonKey: env.SUPABASE_ANON_KEY
        })
      : createUnavailableClient());

  return {
    async authenticate(credentials): Promise<AdminIdentity | null> {
      const result = await client.signInWithPassword(credentials);

      if (result.user === null) {
        throw new AdminAuthError("INVALID_CREDENTIALS");
      }

      if (!isAdminUser(result.user)) {
        throw new AdminAuthError("ADMIN_FORBIDDEN");
      }

      return {
        id: result.user.id,
        emailHash: hashAdminEmail(result.user.email ?? credentials.email),
        role: "admin"
      };
    }
  };
}
