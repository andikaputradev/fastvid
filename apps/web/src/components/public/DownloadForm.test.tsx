import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { DownloadForm } from "./DownloadForm";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status
  });
}

describe("DownloadForm", () => {
  it("does not submit an invalid URL", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        jsonResponse({
          success: true,
          data: {
            platforms: []
          }
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<DownloadForm />);

    fireEvent.change(screen.getByLabelText("URL video publik"), {
      target: { value: "ftp://example.com/video" }
    });
    await user.click(screen.getByRole("button", { name: /validasi link/i }));

    expect(await screen.findByText("URL harus memakai protokol http atau https.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/v1/download"))).toBe(false);
  });

  it("handles PROVIDER_NOT_IMPLEMENTED safely", async () => {
    const user = userEvent.setup();
    const submittedUrl = "https://www.tiktok.com/@vidsaveid/video/123";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/v1/platforms")) {
        return jsonResponse({
          success: true,
          data: {
            platforms: [{ description: "TikTok publik", iconUrl: null, name: "TikTok", slug: "tiktok", status: "active" }]
          }
        });
      }

      return jsonResponse(
        {
          success: false,
          error: {
            code: "PROVIDER_NOT_IMPLEMENTED",
            message: "Provider integration is not implemented yet."
          }
        },
        501
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<DownloadForm />);

    fireEvent.change(screen.getByLabelText("URL video publik"), {
      target: { value: submittedUrl }
    });
    await user.click(screen.getByRole("button", { name: /validasi link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Platform valid, tetapi provider download belum aktif.");
    expect(screen.queryByText(submittedUrl)).not.toBeInTheDocument();
  });

  it("does not render raw submitted URL in generic errors", async () => {
    const user = userEvent.setup();
    const submittedUrl = "https://example.com/private-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/api/v1/platforms")) {
          return jsonResponse({ success: true, data: { platforms: [] } });
        }

        return jsonResponse(
          {
            success: false,
            error: {
              code: "UNSUPPORTED_DOMAIN",
              message: submittedUrl
            }
          },
          400
        );
      })
    );

    renderWithProviders(<DownloadForm />);

    fireEvent.change(screen.getByLabelText("URL video publik"), {
      target: { value: submittedUrl }
    });
    await user.click(screen.getByRole("button", { name: /validasi link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Link tidak dapat diproses. Pastikan link bersifat publik dan platform didukung."
    );
    expect(screen.queryByText(submittedUrl)).not.toBeInTheDocument();
  });
});
