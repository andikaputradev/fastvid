import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-tests-12345";

const supabaseUrl = "https://project.supabase.co";
const serviceRoleKey = "service-role-key";
const adminEmail = "admin@example.com";
const adminUserId = "11111111-1111-4111-8111-111111111111";

async function loadBootstrapModule() {
  return import("./scripts/bootstrap-admin.js");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

test("bootstrapAdmin finds user by email and assigns admin role", async () => {
  const { bootstrapAdmin } = await loadBootstrapModule();
  const requests: Array<{ body: string | null; method: string; url: string }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : null
    });

    if (String(input).includes("/auth/v1/admin/users?")) {
      return jsonResponse({
        users: [
          {
            id: adminUserId,
            email: adminEmail,
            app_metadata: {
              existing: true
            }
          }
        ]
      });
    }

    return jsonResponse({
      id: adminUserId
    });
  };
  const result = await bootstrapAdmin({
    adminEmail,
    fetchImpl,
    serviceRoleKey,
    supabaseUrl
  });
  const updateRequest = requests.find((request) => request.method === "PUT");
  const serializedResult = JSON.stringify(result);
  const updateBody = JSON.parse(updateRequest?.body ?? "{}") as {
    app_metadata?: Record<string, unknown>;
  };

  assert.equal(result.userId, adminUserId);
  assert.equal(result.emailHash.length, 64);
  assert.equal(result.role, "admin");
  assert.equal(serializedResult.includes(adminEmail), false);
  assert.equal(serializedResult.includes(serviceRoleKey), false);
  assert.equal(updateBody.app_metadata?.existing, true);
  assert.equal(updateBody.app_metadata?.role, "admin");
});

test("bootstrapAdmin fails closed when user is not found", async () => {
  const { AdminBootstrapError, bootstrapAdmin } = await loadBootstrapModule();
  const fetchImpl: typeof fetch = async () =>
    jsonResponse({
      users: []
    });

  await assert.rejects(
    () =>
      bootstrapAdmin({
        adminEmail,
        fetchImpl,
        serviceRoleKey,
        supabaseUrl
      }),
    (error: unknown) =>
      error instanceof AdminBootstrapError && error.code === "BOOTSTRAP_USER_NOT_FOUND"
  );
});

test("bootstrapAdmin fails closed when service role request fails", async () => {
  const { AdminBootstrapError, bootstrapAdmin } = await loadBootstrapModule();
  const fetchImpl: typeof fetch = async () =>
    jsonResponse(
      {
        error: "forbidden"
      },
      403
    );

  await assert.rejects(
    () =>
      bootstrapAdmin({
        adminEmail,
        fetchImpl,
        serviceRoleKey,
        supabaseUrl
      }),
    (error: unknown) =>
      error instanceof AdminBootstrapError && error.code === "BOOTSTRAP_REQUEST_FAILED"
  );
});

test("bootstrapAdmin fails closed when required input is missing", async () => {
  const { AdminBootstrapError, bootstrapAdmin } = await loadBootstrapModule();

  await assert.rejects(
    () =>
      bootstrapAdmin({
        adminEmail: "",
        fetchImpl: async () => jsonResponse({ users: [] }),
        serviceRoleKey,
        supabaseUrl
      }),
    (error: unknown) =>
      error instanceof AdminBootstrapError && error.code === "BOOTSTRAP_ENV_MISSING"
  );
});
