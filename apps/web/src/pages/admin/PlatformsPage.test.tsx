import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { PlatformsPage } from "./PlatformsPage";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

describe("PlatformsPage", () => {
  it("renders legacy string-backed arrays without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            platforms: [
              {
                baseDomains: "[\"example.com\",\"www.example.com\"]",
                id: "00000000-0000-4000-8000-000000000001",
                isActive: false,
                maxRequestsPerMinute: 10,
                name: "Example",
                slug: "example",
                status: "inactive"
              }
            ]
          }
        })
      )
    );

    renderWithProviders(<PlatformsPage />);

    expect(await screen.findByText("example.com, www.example.com")).toBeInTheDocument();
  });

  it("creates platforms with normalized array and number fields", async () => {
    document.cookie = "vidsaveid_admin_csrf=csrf-token; path=/";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({
          success: true,
          data: {
            platform: {
              base_domains: ["example.com", "www.example.com"],
              id: "00000000-0000-4000-8000-000000000002",
              is_active: false,
              max_requests_per_minute: 30,
              name: "Example",
              slug: "example",
              status: "inactive"
            }
          }
        });
      }

      return jsonResponse({
        success: true,
        data: {
          platforms: []
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithProviders(<PlatformsPage />);

    await screen.findByText("No platforms found.");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Example" } });
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "Example" } });
    fireEvent.change(screen.getByLabelText("Base Domains"), { target: { value: "example.com\nwww.example.com" } });
    fireEvent.change(screen.getByLabelText("Max Requests Per Minute"), { target: { value: "30" } });
    await user.click(screen.getByRole("button", { name: /create platform/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/platforms"), expect.objectContaining({ method: "POST" })));
    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    const payload = JSON.parse(String(postCall?.[1]?.body)) as { base_domains: string[]; max_requests_per_minute: number };

    expect(payload.base_domains).toEqual(["example.com", "www.example.com"]);
    expect(payload.max_requests_per_minute).toBe(30);
    expect((postCall?.[1]?.headers as Record<string, string>)["x-csrf-token"]).toBe("csrf-token");
  });
});
