export const ADMIN_CSRF_COOKIE_NAME = "fastvid_admin_csrf";
export const LEGACY_ADMIN_CSRF_COOKIE_NAME = "vidsaveid_admin_csrf";

let inMemoryCsrfToken: string | null = null;

export function setAdminCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token !== null && token.length > 0) {
        window.sessionStorage?.setItem("fastvid_admin_csrf", token);
        window.localStorage?.setItem("fastvid_admin_csrf", token);
      } else {
        window.sessionStorage?.removeItem("fastvid_admin_csrf");
        window.localStorage?.removeItem("fastvid_admin_csrf");
      }
    } catch {
      // Ignore storage access errors
    }
  }
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (cookie === undefined) {
    return null;
  }

  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

export function readAdminCsrfToken(): string | null {
  if (inMemoryCsrfToken !== null && inMemoryCsrfToken.length > 0) {
    return inMemoryCsrfToken;
  }

  if (typeof window !== "undefined") {
    try {
      const sessionToken = window.sessionStorage?.getItem("fastvid_admin_csrf");
      if (sessionToken !== null && sessionToken.length > 0) {
        inMemoryCsrfToken = sessionToken;
        return sessionToken;
      }

      const localToken = window.localStorage?.getItem("fastvid_admin_csrf");
      if (localToken !== null && localToken.length > 0) {
        inMemoryCsrfToken = localToken;
        return localToken;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  return readCookie(ADMIN_CSRF_COOKIE_NAME) ?? readCookie(LEGACY_ADMIN_CSRF_COOKIE_NAME);
}
