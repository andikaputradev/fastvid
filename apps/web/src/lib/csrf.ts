export const ADMIN_CSRF_COOKIE_NAME = "fastvid_admin_csrf";
export const LEGACY_ADMIN_CSRF_COOKIE_NAME = "vidsaveid_admin_csrf";

export function readCookie(name: string): string | null {
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
  return readCookie(ADMIN_CSRF_COOKIE_NAME) ?? readCookie(LEGACY_ADMIN_CSRF_COOKIE_NAME);
}
