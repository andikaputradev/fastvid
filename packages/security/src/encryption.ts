import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { failure, success, type SecurityResult } from "./result.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PAYLOAD_VERSION = "v1";

function normalizeKey(key: Uint8Array): SecurityResult<Buffer> {
  if (key.byteLength !== KEY_LENGTH) {
    return failure("invalid_encryption_key");
  }

  return success(Buffer.from(key));
}

export function encryptApiKey(plaintext: string, keyInput: Uint8Array): SecurityResult<string> {
  const keyResult = normalizeKey(keyInput);

  if (!keyResult.ok) {
    return keyResult;
  }

  const iv = randomBytes(IV_LENGTH);

  try {
    const cipher = createCipheriv(ALGORITHM, keyResult.value, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return success(
      [PAYLOAD_VERSION, iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(
        "."
      )
    );
  } catch {
    return failure("encryption_failed");
  }
}

export function decryptApiKey(encryptedValue: string, keyInput: Uint8Array): SecurityResult<string> {
  const keyResult = normalizeKey(keyInput);

  if (!keyResult.ok) {
    return keyResult;
  }

  const [version, encodedIv, encodedAuthTag, encodedCiphertext] = encryptedValue.split(".");

  if (
    version !== PAYLOAD_VERSION ||
    encodedIv === undefined ||
    encodedAuthTag === undefined ||
    encodedCiphertext === undefined
  ) {
    return failure("invalid_encrypted_payload");
  }

  try {
    const iv = Buffer.from(encodedIv, "base64url");
    const authTag = Buffer.from(encodedAuthTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH || ciphertext.length === 0) {
      return failure("invalid_encrypted_payload");
    }

    const decipher = createDecipheriv(ALGORITHM, keyResult.value, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    decipher.setAuthTag(authTag);

    return success(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
  } catch {
    return failure("invalid_encrypted_payload");
  }
}

export function encryptSecret(plaintext: string, base64Key: string): SecurityResult<string> {
  return encryptApiKey(plaintext, Buffer.from(base64Key, "base64"));
}

export function decryptSecret(encryptedValue: string, base64Key: string): SecurityResult<string> {
  return decryptApiKey(encryptedValue, Buffer.from(base64Key, "base64"));
}
