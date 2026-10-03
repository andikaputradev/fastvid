import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { SiteSettingsPage } from "./SiteSettingsPage";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

const settings = [
  { key: "site_name", value: "FastVid", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "site_title", value: "FastVid", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "meta_description", value: "Save public videos.", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "tagline", value: "Save public videos.", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "logo_url", value: "", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "favicon_url", value: "", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "site_status", value: "active", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "maintenance_mode", value: "false", value_type: "boolean", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "maintenance_message", value: "Maintenance", value_type: "string", is_public: true, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "turnstile_enabled", value: "true", value_type: "boolean", is_public: false, description: null, updated_at: "2026-01-01T00:00:00.000Z" },
  { key: "rate_limit_public_per_minute", value: "10", value_type: "number", is_public: false, description: null, updated_at: "2026-01-01T00:00:00.000Z" }
];

describe("SiteSettingsPage", () => {
  it("loads settings and sends typed update values", async () => {
    document.cookie = "fastvid_admin_csrf=csrf-token; path=/";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return jsonResponse({
          success: true,
          data: {
            setting: settings[0]
          }
        });
      }

      return jsonResponse({
        success: true,
        data: {
          settings
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<SiteSettingsPage />);

    await waitFor(() => expect(screen.getByLabelText("Meta Description")).toHaveValue("Save public videos."));
    fireEvent.click(screen.getByLabelText("Maintenance Mode"));
    fireEvent.change(screen.getByLabelText("Public Rate Limit Per Minute"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(fetchMock.mock.calls.some((call) => call[1]?.method === "PUT")).toBe(true));

    const maintenanceCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/settings/maintenance_mode"));
    const rateLimitCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/settings/rate_limit_public_per_minute"));

    expect(JSON.parse(String(maintenanceCall?.[1]?.body))).toEqual({ value: true });
    expect(JSON.parse(String(rateLimitCall?.[1]?.body))).toEqual({ value: 30 });
    expect((maintenanceCall?.[1]?.headers as Record<string, string>)["x-csrf-token"]).toBe("csrf-token");
  });
});
