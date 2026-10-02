import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";
import type { SupabaseAdminAuthClient } from "./auth/supabaseAdminAuthProvider.js";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-tests-12345";
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminUserId = "11111111-1111-4111-8111-111111111111";
const adminEmail = "admin@example.com";
const password = "correct-password";

async function loadProviderModule() {
  return import("./auth/supabaseAdminAuthProvider.js");
}

async function loadAuthProviderModule() {
  return import("./auth/adminAuthProvider.js");
}

test("Supabase adapter maps valid admin user to sanitized admin identity", async () => {
  const { createSupabaseAdminAuthProvider } = await loadProviderModule();
  const client: SupabaseAdminAuthClient = {
    async signInWithPassword() {
      return {
        user: {
          id: adminUserId,
          email: adminEmail,
          app_metadata: {
            role: "admin"
          }
        }
      };
    }
  };
  const provider = createSupabaseAdminAuthProvider({ client });
  const identity = await provider.authenticate({
    email: adminEmail,
    password
  });
  const serializedIdentity = JSON.stringify(identity);

  assert.notEqual(identity, null);
  assert.equal(identity?.id, adminUserId);
  assert.equal(identity?.role, "admin");
  assert.equal(identity?.emailHash.length, 64);
  assert.equal(serializedIdentity.includes(adminEmail), false);
  assert.equal(serializedIdentity.includes(password), false);
  assert.equal(serializedIdentity.includes("access-token"), false);
  assert.equal(serializedIdentity.includes("refresh-token"), false);
});

test("Supabase adapter rejects invalid credentials", async () => {
  const { createSupabaseAdminAuthProvider } = await loadProviderModule();
  const { AdminAuthError } = await loadAuthProviderModule();
  const client: SupabaseAdminAuthClient = {
    async signInWithPassword() {
      throw new AdminAuthError("INVALID_CREDENTIALS");
    }
  };
  const provider = createSupabaseAdminAuthProvider({ client });

  await assert.rejects(
    () =>
      provider.authenticate({
        email: adminEmail,
        password: "wrong-password"
      }),
    (error: unknown) => error instanceof AdminAuthError && error.code === "INVALID_CREDENTIALS"
  );
});

test("Supabase adapter rejects non-admin user", async () => {
  const { createSupabaseAdminAuthProvider } = await loadProviderModule();
  const { AdminAuthError } = await loadAuthProviderModule();
  const client: SupabaseAdminAuthClient = {
    async signInWithPassword() {
      return {
        user: {
          id: adminUserId,
          email: adminEmail,
          app_metadata: {
            role: "user"
          }
        }
      };
    }
  };
  const provider = createSupabaseAdminAuthProvider({ client });

  await assert.rejects(
    () =>
      provider.authenticate({
        email: adminEmail,
        password
      }),
    (error: unknown) => error instanceof AdminAuthError && error.code === "ADMIN_FORBIDDEN"
  );
});

test("Supabase adapter fails closed when env client is unavailable", async () => {
  const { createSupabaseAdminAuthProvider } = await loadProviderModule();
  const { AdminAuthError } = await loadAuthProviderModule();
  const provider = createSupabaseAdminAuthProvider();

  await assert.rejects(
    () =>
      provider.authenticate({
        email: adminEmail,
        password
      }),
    (error: unknown) => error instanceof AdminAuthError && error.code === "AUTH_UNAVAILABLE"
  );
});

test("Fetch Supabase client ignores tokens and returns only user payload", async () => {
  const { createFetchSupabaseAuthClient } = await loadProviderModule();
  const requests: Array<{ body: unknown; headers: unknown }> = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    requests.push({
      body: init?.body,
      headers: init?.headers ?? {}
    });

    return new Response(
      JSON.stringify({
        access_token: "access-token",
        refresh_token: "refresh-token",
        user: {
          id: adminUserId,
          email: adminEmail,
          app_metadata: {
            role: "admin"
          }
        }
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  };
  const client = createFetchSupabaseAuthClient({
    supabaseUrl: "https://project.supabase.co",
    anonKey: "anon-key",
    fetchImpl
  });
  const result = await client.signInWithPassword({
    email: adminEmail,
    password
  });
  const serializedResult = JSON.stringify(result);

  assert.equal(result.user?.id, adminUserId);
  assert.equal(serializedResult.includes("access-token"), false);
  assert.equal(serializedResult.includes("refresh-token"), false);
  assert.equal(requests.length, 1);
});
