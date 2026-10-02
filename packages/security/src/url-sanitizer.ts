import { failure, success, unwrapSecurityResult, type SecurityResult } from "./result.js";

export interface SanitizedUrl {
  href: string;
  hostname: string;
  protocol: "http:" | "https:";
}

export function sanitizeUrl(input: string): SecurityResult<SanitizedUrl> {
  const cleanedInput = input.replaceAll("\0", "").trim();

  if (cleanedInput.length === 0) {
    return failure("empty_url");
  }

  let parsed: URL;

  try {
    parsed = new URL(cleanedInput);
  } catch {
    return failure("invalid_url");
  }

  const protocol = parsed.protocol;

  if (protocol !== "http:" && protocol !== "https:") {
    return failure("unsupported_url_protocol");
  }

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  return success({
    href: parsed.toString(),
    hostname: parsed.hostname,
    protocol
  });
}

export function sanitizeUrlString(input: string): SecurityResult<string> {
  const result = sanitizeUrl(input);

  if (!result.ok) {
    return result;
  }

  return success(result.value.href);
}

export function sanitizePublicUrl(input: string): SanitizedUrl {
  return unwrapSecurityResult(sanitizeUrl(input));
}
