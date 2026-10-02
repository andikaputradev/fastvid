import { describe, expect, it } from "vitest";
import { readAdminCsrfToken } from "./csrf";

describe("csrf helpers", () => {
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
