import { beforeEach, describe, expect, it } from "vitest";
import { readAdminCsrfToken, setAdminCsrfToken } from "./csrf";

describe("csrf helpers", () => {
  beforeEach(() => {
    setAdminCsrfToken(null);
    document.cookie = "fastvid_admin_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "vidsaveid_admin_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("reads CSRF token from setAdminCsrfToken", () => {
    setAdminCsrfToken("explicit-token");
    expect(readAdminCsrfToken()).toBe("explicit-token");
  });

  it("reads CSRF token from readable cookie", () => {
    document.cookie = "fastvid_admin_csrf=csrf-token; path=/";

    expect(readAdminCsrfToken()).toBe("csrf-token");
  });

  it("returns null safely when missing", () => {
    expect(readAdminCsrfToken()).toBeNull();
  });

  it("does not read the admin session cookie", () => {
    document.cookie = "vidsaveid_admin_session=session-token; path=/";

    expect(readAdminCsrfToken()).toBeNull();
  });
});
