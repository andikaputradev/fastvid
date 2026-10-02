import { createHmac } from "node:crypto";
import { failure, success, type SecurityResult } from "./result.js";

export type SensitiveHashKind = "ip" | "submitted_url" | "user_agent";

function secretLength(secret: string | Uint8Array): number {
  return typeof secret === "string" ? Buffer.byteLength(secret, "utf8") : secret.byteLength;
}

export function hashSensitiveValue(
  value: string,
  secret: string | Uint8Array,
  kind: SensitiveHashKind
): SecurityResult<string> {
  if (value.length === 0) {
    return failure("invalid_hash_input");
  }

  if (secretLength(secret) === 0) {
    return failure("empty_secret");
  }

  const digest = createHmac("sha256", secret).update(`fastvid:${kind}:`, "utf8").update(value, "utf8").digest("hex");

  return success(digest);
}

export function hashIpAddress(ipAddress: string, secret: string | Uint8Array): SecurityResult<string> {
  return hashSensitiveValue(ipAddress, secret, "ip");
}

export function hashUserAgent(userAgent: string, secret: string | Uint8Array): SecurityResult<string> {
  return hashSensitiveValue(userAgent, secret, "user_agent");
}

export function hashSubmittedUrl(url: string, secret: string | Uint8Array): SecurityResult<string> {
  return hashSensitiveValue(url, secret, "submitted_url");
}
