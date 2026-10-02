import { domainToASCII } from "node:url";
import { failure, success, unwrapSecurityResult, type SecurityResult } from "./result.js";

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");

  if (trimmed.length === 0) {
    return "";
  }

  return domainToASCII(trimmed);
}

function hostnameFromUrl(url: string | URL): string {
  return url instanceof URL ? url.hostname : new URL(url).hostname;
}

export function isHostnameAllowed(hostname: string, allowedDomains: readonly string[]): boolean {
  const normalizedHostname = normalizeDomain(hostname);

  if (normalizedHostname.length === 0) {
    return false;
  }

  return allowedDomains.some((allowedDomain) => {
    const normalizedAllowed = normalizeDomain(allowedDomain);

    return (
      normalizedAllowed.length > 0 &&
      (normalizedHostname === normalizedAllowed || normalizedHostname.endsWith(`.${normalizedAllowed}`))
    );
  });
}

export function checkDomainAllowlist(url: string | URL, allowedDomains: readonly string[]): SecurityResult<boolean> {
  let hostname: string;

  try {
    hostname = hostnameFromUrl(url);
  } catch {
    return failure("invalid_url");
  }

  if (!isHostnameAllowed(hostname, allowedDomains)) {
    return failure("domain_not_allowed");
  }

  return success(true);
}

export function assertHostnameAllowed(hostname: string, allowedDomains: readonly string[]): void {
  const result = isHostnameAllowed(hostname, allowedDomains) ? success(true) : failure<boolean>("domain_not_allowed");
  unwrapSecurityResult(result);
}
