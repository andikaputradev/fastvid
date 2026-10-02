import { pathToFileURL } from "node:url";
import { env } from "../config/env.js";
import { hashAdminEmail } from "../auth/adminSession.js";

const usersPerPage = 1000;
const maxUserPages = 100;

export type AdminBootstrapErrorCode =
  | "BOOTSTRAP_ENV_MISSING"
  | "BOOTSTRAP_REQUEST_FAILED"
  | "BOOTSTRAP_USER_NOT_FOUND";

export class AdminBootstrapError extends Error {
  constructor(
    readonly code: AdminBootstrapErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AdminBootstrapError";
  }
}

interface SupabaseAdminUser {
  id: string;
  email: string | null;
  appMetadata: Record<string, unknown>;
}

export interface BootstrapAdminOptions {
  adminEmail: string;
  fetchImpl?: typeof fetch;
  serviceRoleKey: string;
  supabaseUrl: string;
}

export interface BootstrapAdminResult {
  userId: string;
  emailHash: string;
  role: "admin";
}

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/+$/u, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function requireRuntimeValue(name: string, value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new AdminBootstrapError("BOOTSTRAP_ENV_MISSING", `${name} is required.`);
  }

  return value.trim();
}

function parseUser(value: unknown): SupabaseAdminUser | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== "string" || record.id.length === 0) {
    return null;
  }

  return {
    id: record.id,
    email: typeof record.email === "string" ? record.email : null,
    appMetadata:
      typeof record.app_metadata === "object" && record.app_metadata !== null
        ? (record.app_metadata as Record<string, unknown>)
        : {}
  };
}

function parseUsersResponse(value: unknown): SupabaseAdminUser[] {
  const rawUsers =
    Array.isArray(value) || value === null || typeof value !== "object"
      ? value
      : (value as Record<string, unknown>).users;

  if (!Array.isArray(rawUsers)) {
    return [];
  }

  return rawUsers.flatMap((rawUser) => {
    const user = parseUser(rawUser);

    return user === null ? [] : [user];
  });
}

async function readJsonResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

async function requestSupabaseAdmin(
  fetchImpl: typeof fetch,
  serviceRoleKey: string,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new AdminBootstrapError(
      "BOOTSTRAP_REQUEST_FAILED",
      "Supabase service role request failed."
    );
  }

  return response;
}

async function findUserByEmail(
  options: Required<BootstrapAdminOptions>
): Promise<SupabaseAdminUser | null> {
  const targetEmail = normalizeEmail(options.adminEmail);
  const baseUrl = normalizeSupabaseUrl(options.supabaseUrl);

  for (let page = 1; page <= maxUserPages; page += 1) {
    const response = await requestSupabaseAdmin(
      options.fetchImpl,
      options.serviceRoleKey,
      `${baseUrl}/auth/v1/admin/users?page=${page}&per_page=${usersPerPage}`
    );
    const users = parseUsersResponse(await readJsonResponse(response));
    const matchedUser = users.find(
      (user) => user.email !== null && normalizeEmail(user.email) === targetEmail
    );

    if (matchedUser !== undefined) {
      return matchedUser;
    }

    if (users.length < usersPerPage) {
      return null;
    }
  }

  return null;
}

async function assignAdminRole(
  options: Required<BootstrapAdminOptions>,
  user: SupabaseAdminUser
): Promise<void> {
  const baseUrl = normalizeSupabaseUrl(options.supabaseUrl);

  await requestSupabaseAdmin(
    options.fetchImpl,
    options.serviceRoleKey,
    `${baseUrl}/auth/v1/admin/users/${user.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        app_metadata: {
          ...user.appMetadata,
          role: "admin"
        }
      })
    }
  );
}

export async function bootstrapAdmin(
  options: BootstrapAdminOptions
): Promise<BootstrapAdminResult> {
  const normalizedOptions: Required<BootstrapAdminOptions> = {
    adminEmail: requireRuntimeValue("ADMIN_BOOTSTRAP_EMAIL", options.adminEmail),
    fetchImpl: options.fetchImpl ?? fetch,
    serviceRoleKey: requireRuntimeValue("SUPABASE_SERVICE_ROLE_KEY", options.serviceRoleKey),
    supabaseUrl: requireRuntimeValue("SUPABASE_URL", options.supabaseUrl)
  };
  const user = await findUserByEmail(normalizedOptions);

  if (user === null) {
    throw new AdminBootstrapError("BOOTSTRAP_USER_NOT_FOUND", "Supabase Auth user was not found.");
  }

  await assignAdminRole(normalizedOptions, user);

  return {
    userId: user.id,
    emailHash: hashAdminEmail(normalizedOptions.adminEmail),
    role: "admin"
  };
}

async function runBootstrapFromEnv(): Promise<void> {
  const result = await bootstrapAdmin({
    adminEmail: process.env.ADMIN_BOOTSTRAP_EMAIL ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    supabaseUrl: env.SUPABASE_URL ?? ""
  });

  console.info({
    status: "admin_bootstrapped",
    userId: result.userId,
    emailHash: result.emailHash,
    role: result.role
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBootstrapFromEnv().catch((error: unknown) => {
    if (error instanceof AdminBootstrapError) {
      console.error({
        status: "failed",
        code: error.code,
        message: error.message
      });
    } else {
      console.error({
        status: "failed",
        code: "BOOTSTRAP_REQUEST_FAILED",
        message: "Admin bootstrap failed."
      });
    }

    process.exitCode = 1;
  });
}
