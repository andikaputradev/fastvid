export const ERROR_CODES = {
  VALIDATION_FAILED: "validation_failed",
  PROVIDER_NOT_IMPLEMENTED: "provider_not_implemented",
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  INTERNAL_ERROR: "internal_error"
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
