import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { failure, success, unwrapSecurityResult, type SecurityResult } from "./result.js";
import { sanitizeUrl } from "./url-sanitizer.js";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

export interface DnsAddress {
  address: string;
  family: 4 | 6;
}

export interface SsrfGuardOptions {
  resolveHostname?: (hostname: string) => Promise<readonly DnsAddress[]>;
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "").toLowerCase();
}

function parseIpv4(value: string): readonly [number, number, number, number] | null {
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = Number(match[3]);
  const fourth = Number(match[4]);
  const octets = [first, second, third, fourth] as const;

  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

function isBlockedIpv4(address: string): boolean {
  const octets = parseIpv4(address);

  if (octets === null) {
    return true;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function firstIpv6Hextet(address: string): number | null {
  const firstSegment = address.split(":")[0];

  if (firstSegment === undefined || firstSegment.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(firstSegment, 16);
  return Number.isNaN(parsed) ? null : parsed;
}

function isBlockedIpv6(address: string): boolean {
  const normalized = normalizeHostname(address);
  const mappedIpv4 = normalized.startsWith("::ffff:") ? normalized.slice("::ffff:".length) : "";

  if (mappedIpv4.length > 0 && parseIpv4(mappedIpv4) !== null) {
    return isBlockedIpv4(mappedIpv4);
  }

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  const firstHextet = firstIpv6Hextet(normalized);

  if (firstHextet === null) {
    return normalized.startsWith("::");
  }

  return (
    (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) ||
    (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) ||
    (firstHextet >= 0xff00 && firstHextet <= 0xffff)
  );
}

function isBlockedIpAddress(address: string): boolean {
  const family = isIP(normalizeHostname(address));

  if (family === 4) {
    return isBlockedIpv4(normalizeHostname(address));
  }

  if (family === 6) {
    return isBlockedIpv6(address);
  }

  return true;
}

async function defaultResolveHostname(hostname: string): Promise<readonly DnsAddress[]> {
  const records = await lookup(hostname, {
    all: true,
    verbatim: true
  });

  return records.map((record) => ({
    address: record.address,
    family: record.family === 6 ? 6 : 4
  }));
}

export async function validateNoSsrfTarget(
  input: string,
  options: SsrfGuardOptions = {}
): Promise<SecurityResult<string>> {
  const sanitized = sanitizeUrl(input);

  if (!sanitized.ok) {
    return sanitized;
  }

  const hostname = normalizeHostname(sanitized.value.hostname);

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return failure("ssrf_target_blocked");
  }

  const hostnameFamily = isIP(hostname);

  if (hostnameFamily !== 0) {
    return isBlockedIpAddress(hostname) ? failure("ssrf_target_blocked") : success(sanitized.value.href);
  }

  const resolveHostname = options.resolveHostname ?? defaultResolveHostname;
  let addresses: readonly DnsAddress[];

  try {
    addresses = await resolveHostname(hostname);
  } catch {
    return failure("dns_resolution_failed");
  }

  if (addresses.length === 0) {
    return failure("dns_resolution_failed");
  }

  if (addresses.some((record) => record.family !== 4 && record.family !== 6)) {
    return failure("dns_resolution_failed");
  }

  return addresses.some((record) => isBlockedIpAddress(record.address))
    ? failure("ssrf_target_blocked")
    : success(sanitized.value.href);
}

export async function assertNoSsrfTarget(input: string, options: SsrfGuardOptions = {}): Promise<string> {
  return unwrapSecurityResult(await validateNoSsrfTarget(input, options));
}

export function assertNoObviousSsrfTarget(hostname: string): void {
  const normalizedHostname = normalizeHostname(hostname);
  const result =
    BLOCKED_HOSTNAMES.has(normalizedHostname) || (isIP(normalizedHostname) !== 0 && isBlockedIpAddress(normalizedHostname))
      ? failure<string>("ssrf_target_blocked")
      : success(normalizedHostname);

  unwrapSecurityResult(result);
}
