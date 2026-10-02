import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-tests-12345";

test("safe request path keeps route path without query values", async () => {
  const { safeRequestPath } = await import("./logger.js");
  const path = safeRequestPath("/api/v1/download?url=https%3A%2F%2Fexample.com%2Fsecret");
  const serializedText = JSON.stringify({ path });

  assert.equal(path, "/api/v1/download");
  assert.equal(serializedText.includes("example.com"), false);
  assert.equal(serializedText.includes("secret"), false);
});
