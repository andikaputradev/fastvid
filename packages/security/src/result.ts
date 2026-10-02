export type SecurityErrorCode =
  | "domain_not_allowed"
  | "dns_resolution_failed"
  | "empty_secret"
  | "empty_url"
  | "encryption_failed"
  | "invalid_encryption_key"
  | "invalid_encrypted_payload"
  | "invalid_hash_input"
  | "invalid_url"
  | "ssrf_target_blocked"
  | "unsupported_url_protocol";

export interface SecurityError {
  code: SecurityErrorCode;
  message: string;
}

export type SecurityResult<T> = { ok: true; value: T } | { ok: false; error: SecurityError };

export function success<T>(value: T): SecurityResult<T> {
  return { ok: true, value };
}

export function failure<T>(code: SecurityErrorCode, message = code): SecurityResult<T> {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export class SecurityValidationError extends Error {
  public readonly code: SecurityErrorCode;

  public constructor(error: SecurityError) {
    super(error.message);
    this.name = "SecurityValidationError";
    this.code = error.code;
  }
}

export function unwrapSecurityResult<T>(result: SecurityResult<T>): T {
  if (!result.ok) {
    throw new SecurityValidationError(result.error);
  }

  return result.value;
}
