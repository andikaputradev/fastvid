import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  checkDomainAllowlist,
  decryptApiKey,
  encryptApiKey,
  hashIpAddress,
  hashSubmittedUrl,
  hashUserAgent,
  sanitizeUrl,
  validateNoSsrfTarget,
  type SecurityResult
} from "./index.js";

function expectOk<T>(result: SecurityResult<T>): T {
  assert.equal(result.ok, true);
  return result.value;
}

function expectFailure<T>(result: SecurityResult<T>, code?: string): void {
  assert.equal(result.ok, false);

  if (!result.ok && code !== undefined) {
    assert.equal(result.error.code, code);
  }
}

test("URL sanitizer accepts valid http URL", () => {
  const sanitized = expectOk(sanitizeUrl("http://example.com/video"));

  assert.equal(sanitized.href, "http://example.com/video");
});

test("URL sanitizer accepts valid https URL", () => {
  const sanitized = expectOk(sanitizeUrl("https://example.com/video"));

  assert.equal(sanitized.href, "https://example.com/video");
});

test("URL sanitizer normalizes uppercase hostname", () => {
  const sanitized = expectOk(sanitizeUrl("https://WWW.EXAMPLE.COM/Path"));

  assert.equal(sanitized.hostname, "www.example.com");
  assert.equal(sanitized.href, "https://www.example.com/Path");
});

test("URL sanitizer trims whitespace", () => {
  const sanitized = expectOk(sanitizeUrl("  https://example.com/watch  "));

  assert.equal(sanitized.href, "https://example.com/watch");
});

test("URL sanitizer removes null bytes", () => {
  const sanitized = expectOk(sanitizeUrl("\0https://example.com/watch\0"));

  assert.equal(sanitized.href, "https://example.com/watch");
});

test("URL sanitizer removes fragments", () => {
  const sanitized = expectOk(sanitizeUrl("https://example.com/watch#secret"));

  assert.equal(sanitized.href, "https://example.com/watch");
});

test("URL sanitizer rejects invalid URL", () => {
  expectFailure(sanitizeUrl("not a url"), "invalid_url");
});

test("URL sanitizer rejects empty string", () => {
  expectFailure(sanitizeUrl("   "), "empty_url");
});

test("URL sanitizer rejects unsafe protocols", () => {
  expectFailure(sanitizeUrl("file:///etc/passwd"), "unsupported_url_protocol");
  expectFailure(sanitizeUrl("ftp://example.com/file"), "unsupported_url_protocol");
  expectFailure(sanitizeUrl("data:text/plain,hello"), "unsupported_url_protocol");
  expectFailure(sanitizeUrl("javascript:alert(1)"), "unsupported_url_protocol");
});

test("SSRF guard rejects localhost", async () => {
  expectFailure(await validateNoSsrfTarget("https://localhost/video"), "ssrf_target_blocked");
});

test("SSRF guard rejects loopback and private IPv4 targets", async () => {
  expectFailure(await validateNoSsrfTarget("https://127.0.0.1/video"), "ssrf_target_blocked");
  expectFailure(await validateNoSsrfTarget("https://0.0.0.0/video"), "ssrf_target_blocked");
  expectFailure(await validateNoSsrfTarget("https://10.1.2.3/video"), "ssrf_target_blocked");
  expectFailure(await validateNoSsrfTarget("https://172.16.0.1/video"), "ssrf_target_blocked");
  expectFailure(await validateNoSsrfTarget("https://172.31.255.255/video"), "ssrf_target_blocked");
  expectFailure(await validateNoSsrfTarget("https://192.168.1.10/video"), "ssrf_target_blocked");
});

test("SSRF guard rejects link-local metadata IP", async () => {
  expectFailure(await validateNoSsrfTarget("https://169.254.169.254/latest/meta-data"), "ssrf_target_blocked");
});

test("SSRF guard rejects IPv6 loopback", async () => {
  expectFailure(await validateNoSsrfTarget("https://[::1]/video"), "ssrf_target_blocked");
});

test("SSRF guard accepts public domain when DNS resolves to public IP", async () => {
  const result = await validateNoSsrfTarget("https://example.com/video#frag", {
    resolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });

  assert.equal(expectOk(result), "https://example.com/video");
});

test("Domain allowlist accepts exact allowed domain", () => {
  assert.equal(expectOk(checkDomainAllowlist("https://tiktok.com/watch", ["tiktok.com"])), true);
});

test("Domain allowlist accepts allowed subdomain", () => {
  assert.equal(expectOk(checkDomainAllowlist("https://www.instagram.com/reel/1", ["instagram.com"])), true);
});

test("Domain allowlist rejects suffix attacks", () => {
  expectFailure(checkDomainAllowlist("https://tiktok.com.evil.com/watch", ["tiktok.com"]), "domain_not_allowed");
  expectFailure(
    checkDomainAllowlist("https://instagram.com.attacker.net/reel/1", ["instagram.com"]),
    "domain_not_allowed"
  );
});

test("Domain allowlist rejects unrelated domain", () => {
  expectFailure(checkDomainAllowlist("https://example.net/watch", ["tiktok.com"]), "domain_not_allowed");
});

test("Hashing is deterministic for the same input and secret", () => {
  const secret = "s".repeat(32);
  const first = expectOk(hashIpAddress("203.0.113.10", secret));
  const second = expectOk(hashIpAddress("203.0.113.10", secret));

  assert.equal(first, second);
});

test("Hashing changes when the secret changes", () => {
  const first = expectOk(hashUserAgent("Mozilla/5.0", "a".repeat(32)));
  const second = expectOk(hashUserAgent("Mozilla/5.0", "b".repeat(32)));

  assert.notEqual(first, second);
});

test("Hashing never exposes the original input", () => {
  const input = "https://example.com/video";
  const hash = expectOk(hashSubmittedUrl(input, "u".repeat(32)));

  assert.notEqual(hash, input);
  assert.equal(hash.includes(input), false);
});

test("Encryption encrypts and decrypts API keys", () => {
  const key = randomBytes(32);
  const plaintext = "provider-api-key";
  const encrypted = expectOk(encryptApiKey(plaintext, key));
  const decrypted = expectOk(decryptApiKey(encrypted, key));

  assert.notEqual(encrypted, plaintext);
  assert.equal(decrypted, plaintext);
});

test("Encryption fails with wrong key", () => {
  const encrypted = expectOk(encryptApiKey("provider-api-key", randomBytes(32)));

  expectFailure(decryptApiKey(encrypted, randomBytes(32)), "invalid_encrypted_payload");
});

test("Encryption fails when payload is tampered", () => {
  const key = randomBytes(32);
  const encrypted = expectOk(encryptApiKey("provider-api-key", key));
  const parts = encrypted.split(".");
  const tamperedAuthTag = parts[2]!.startsWith("A") ? `B${parts[2]!.slice(1)}` : `A${parts[2]!.slice(1)}`;
  const tampered = `${parts[0]}.${parts[1]}.${tamperedAuthTag}.${parts[3]}`;

  expectFailure(decryptApiKey(tampered, key), "invalid_encrypted_payload");
});

test("Encryption rejects invalid key length", () => {
  expectFailure(encryptApiKey("provider-api-key", randomBytes(31)), "invalid_encryption_key");
});
