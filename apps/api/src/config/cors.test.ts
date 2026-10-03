import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-tests-12345";

test("local CORS allows localhost and 127.0.0.1 for configured preview origin", async () => {
  const { allowedCorsOrigins } = await import("./cors.js");
  const origins = allowedCorsOrigins("http://localhost:4173", "production");

  assert.equal(origins.has("http://localhost:4173"), true);
  assert.equal(origins.has("http://127.0.0.1:4173"), true);
});

test("development CORS allows common Vite local origins", async () => {
  const { allowedCorsOrigins } = await import("./cors.js");
  const origins = allowedCorsOrigins("http://localhost:5173", "development");

  assert.equal(origins.has("http://localhost:5173"), true);
  assert.equal(origins.has("http://127.0.0.1:5173"), true);
  assert.equal(origins.has("http://localhost:4173"), true);
  assert.equal(origins.has("http://127.0.0.1:4173"), true);
});

test("production CORS allows fastvid.my.id and www subdomain automatically", async () => {
  const { allowedCorsOrigins } = await import("./cors.js");
  const origins = allowedCorsOrigins("https://fastvid.my.id", "production");

  assert.deepEqual([...origins], ["https://fastvid.my.id", "https://www.fastvid.my.id"]);
});

test("production CORS supports comma-separated origins", async () => {
  const { allowedCorsOrigins } = await import("./cors.js");
  const origins = allowedCorsOrigins("https://custom.example.com, https://other.example.com", "production");

  assert.deepEqual([...origins], ["https://custom.example.com", "https://other.example.com"]);
});

test("Fastify CORS preflight allows local 127 origin with credentials", async () => {
  const { buildApp } = await import("../app.js");
  const app = await buildApp({ logger: false });

  try {
    const response = await app.inject({
      headers: {
        "access-control-request-method": "POST",
        origin: "http://127.0.0.1:5173"
      },
      method: "OPTIONS",
      url: "/api/v1/admin/auth/login"
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], "http://127.0.0.1:5173");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
  } finally {
    await app.close();
  }
});

test("API sets Cross-Origin-Resource-Policy to cross-origin and exposes x-csrf-token", async () => {
  const { buildApp } = await import("../app.js");
  const app = await buildApp({ logger: false });

  try {
    const response = await app.inject({
      headers: {
        origin: "http://127.0.0.1:5173"
      },
      method: "GET",
      url: "/health"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cross-origin-resource-policy"], "cross-origin");
    assert.equal(response.headers["access-control-allow-origin"], "http://127.0.0.1:5173");
    assert.equal(response.headers["access-control-expose-headers"], "x-csrf-token, x-request-id");
  } finally {
    await app.close();
  }
});

