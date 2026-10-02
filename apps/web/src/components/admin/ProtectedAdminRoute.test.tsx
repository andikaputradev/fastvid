import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status
  });
}

describe("ProtectedAdminRoute", () => {
  it("redirects unauthenticated users to login flow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Unauthorized" }
          },
          401
        )
      )
    );

    renderWithRouter(
      <Routes>
        <Route path="/admin/login" element={<div>Login flow</div>} />
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<div>Admin page</div>} />
        </Route>
      </Routes>,
      ["/admin"]
    );

    expect(await screen.findByText("Login flow")).toBeInTheDocument();
  });

  it("allows authenticated admin page render", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            admin: {
              emailHash: "a".repeat(64),
              id: "00000000-0000-4000-8000-000000000001",
              role: "admin"
            }
          }
        })
      )
    );

    renderWithRouter(
      <Routes>
        <Route path="/admin/login" element={<div>Login flow</div>} />
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<div>Admin page</div>} />
        </Route>
      </Routes>,
      ["/admin"]
    );

    expect(await screen.findByText("Admin page")).toBeInTheDocument();
  });

  it("shows a safe loading state while checking the session", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<div>Admin page</div>} />
        </Route>
      </Routes>,
      ["/admin"]
    );

    expect(screen.getByText("Checking admin session")).toBeInTheDocument();
  });
});
