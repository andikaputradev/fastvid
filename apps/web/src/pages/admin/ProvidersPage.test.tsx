import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { ProvidersPage } from "./ProvidersPage";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

function mockProviders() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse({
        success: true,
        data: {
          providers: [
            {
              api_key_encrypted: "encrypted-provider-secret",
              base_url: "https://provider.example.com/",
              created_at: "2026-01-01T00:00:00.000Z",
              daily_limit: 1000,
              daily_reset_at: "2026-01-02T00:00:00.000Z",
              daily_used: 0,
              hasApiKey: true,
              id: "00000000-0000-4000-8000-000000000001",
              is_active: false,
              last_error: null,
              name: "Mock Provider",
              platform_slug: "tiktok",
              priority: 1,
              slug: "mock-provider",
              updated_at: "2026-01-01T00:00:00.000Z"
            }
          ]
        }
      })
    )
  );
}

describe("ProvidersPage", () => {
  it("displays only configured key state and not key material", async () => {
    mockProviders();

    const { container } = renderWithProviders(<ProvidersPage />);

    expect(await screen.findByText("Configured")).toBeInTheDocument();
    expect(container.textContent).not.toContain("encrypted-provider-secret");
    expect(container.textContent).not.toContain("api_key_encrypted");
  });

  it("does not prefill plaintext API key in edit form", async () => {
    mockProviders();
    const user = userEvent.setup();

    renderWithProviders(<ProvidersPage />);

    await user.click(await screen.findByRole("button", { name: /edit/i }));

    const apiKeyInput = screen.getByLabelText("API Key") as HTMLInputElement;
    expect(apiKeyInput.value).toBe("");
  });
});
