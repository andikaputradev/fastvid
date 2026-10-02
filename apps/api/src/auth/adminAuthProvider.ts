export interface AdminIdentity {
  id: string;
  emailHash: string;
  role: "admin";
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export type AdminAuthErrorCode = "ADMIN_FORBIDDEN" | "AUTH_UNAVAILABLE" | "INVALID_CREDENTIALS";

export class AdminAuthError extends Error {
  constructor(readonly code: AdminAuthErrorCode) {
    super(code);
    this.name = "AdminAuthError";
  }
}

export interface AdminAuthProvider {
  authenticate(credentials: AdminLoginCredentials): Promise<AdminIdentity | null>;
}

export function createUnavailableAdminAuthProvider(): AdminAuthProvider {
  return {
    async authenticate() {
      throw new AdminAuthError("AUTH_UNAVAILABLE");
    }
  };
}
