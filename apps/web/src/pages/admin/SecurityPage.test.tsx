import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { SecurityPage } from "./SecurityPage";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

function mockSecurityFetch() {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
    jsonResponse({
      success: true,
      data: {
        blocked_domains: [],
        rate_rules: [],
        url_patterns: []
      }
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("SecurityPage", () => {
  it("rejects invalid blocked domains before mutation", async () => {
    const fetchMock = mockSecurityFetch();
    const user = userEvent.setup();

    renderWithProviders(<SecurityPage />);

    await screen.findByText("No blocked domains.");
    await user.type(screen.getByPlaceholderText("example.com"), "127.0.0.1");
    await user.click(screen.getByRole("button", { name: /add domain/i }));

    expect(await screen.findByText(/enter a public domain/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });

  it("rejects invalid regex patterns before mutation", async () => {
    const fetchMock = mockSecurityFetch();
    const user = userEvent.setup();

    renderWithProviders(<SecurityPage />);

    await screen.findByText("No blocked patterns.");
    fireEvent.change(screen.getByPlaceholderText("Pattern"), { target: { value: "[" } });
    await user.click(screen.getByRole("button", { name: /add pattern/i }));

    expect(await screen.findByText(/enter a valid regex pattern/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });
});
