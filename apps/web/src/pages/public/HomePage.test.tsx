import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { HomePage } from "./HomePage";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

describe("HomePage", () => {
  it("renders H1 and SEO meta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            platforms: []
          }
        })
      )
    );

    renderWithRouter(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Download Video Sosmed Tanpa Login" })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("FastVid - Download Video Sosmed Tanpa Login");
      expect(document.querySelector("meta[name='description']")).toHaveAttribute(
        "content",
        "Simpan video publik dari sosmed dengan FastVid, web utility untuk link publik tanpa login pengguna."
      );
      expect(document.querySelector("meta[name='robots']")).toHaveAttribute("content", "index,follow");
      expect(document.querySelector("script[type='application/ld+json']")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "Video Downloader Online" })).toHaveAttribute(
      "href",
      "/video-downloader-online"
    );
  });
});
