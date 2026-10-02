import { decryptSecret, encryptSecret } from "@vidsaveid/security";

export interface StreamTokenPayload {
  expiresAt: number;
  filename?: string | undefined;
  headers?: Record<string, string> | undefined;
  url: string;
}

export function createStreamToken(payload: StreamTokenPayload, base64Key: string): string {
  const result = encryptSecret(JSON.stringify(payload), base64Key);
  if (!result.ok) {
    throw new Error("Failed to create download stream token.");
  }
  return result.value;
}

export function parseStreamToken(token: string, base64Key: string): StreamTokenPayload | null {
  const result = decryptSecret(token, base64Key);
  if (!result.ok) {
    return null;
  }
  try {
    const parsed = JSON.parse(result.value) as StreamTokenPayload;
    if (typeof parsed.url !== "string" || typeof parsed.expiresAt !== "number") {
      return null;
    }
    if (Date.now() > parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
