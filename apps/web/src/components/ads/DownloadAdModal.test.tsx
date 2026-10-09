import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { DownloadAdModal } from "./DownloadAdModal";
import { DownloadOptionList } from "../public/DownloadOptionList";
import type { DownloadResponse } from "../../lib/api";
import type * as AdRedirectModule from "../../lib/adRedirect";

vi.mock("../../lib/adRedirect", async (importOriginal) => {
  const actual = await importOriginal<typeof AdRedirectModule>();
  return {
    ...actual,
    triggerBrowserDownload: vi.fn()
  };
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

describe("DownloadAdModal & HD Download Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            ads: [
              {
                slotKey: "popup",
                providerName: "Mitra Sponsor",
                adType: "custom",
                adCode: null,
                customAd: {
                  imageUrl: "https://example.com/ad-hd.jpg",
                  targetUrl: "https://example.com/promo",
                  altText: "Promo Spesial HD"
                }
              }
            ]
          }
        })
      )
    );
  });

  it("does not render when item is null", () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <DownloadAdModal item={null} onCloseAndDownload={onClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when item is provided and calls onCloseAndDownload on close button click", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <DownloadAdModal
        item={{
          url: "https://example.com/stream.mp4",
          downloadHref: "https://example.com/stream.mp4",
          quality: "HD (No Watermark)",
          format: "mp4"
        }}
        onCloseAndDownload={onClose}
      />
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Kualitas Terbaik: HD \(No Watermark\)/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Tutup iklan dan download HD/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens modal on HD download click, redirects to wahyuandikaputra on close, and unlocks item", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue({ closed: false } as Window);

    const mockResult: DownloadResponse = {
      status: "ready",
      title: "Video Test HD",
      media: [
        {
          format: "mp4",
          quality: "HD (No Watermark)",
          url: "/api/v1/download/stream?token=hd_token"
        },
        {
          format: "mp3",
          quality: "Audio (MP3)",
          url: "/api/v1/download/stream?token=audio_token"
        }
      ]
    };

    renderWithProviders(<DownloadOptionList result={mockResult} />);

    // Check HD badge exists
    expect(screen.getByText("HD Iklan")).toBeInTheDocument();

    // Click HD download item
    const hdUnduhBtn = screen.getByText("HD (No Watermark)").closest("a");
    expect(hdUnduhBtn).not.toBeNull();
    fireEvent.click(hdUnduhBtn!);

    // Modal should be open
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Click close/download in modal
    const closeAndDownloadBtn = screen.getByRole("button", { name: /Tutup Iklan & Download HD/i });
    fireEvent.click(closeAndDownloadBtn);

    // Should redirect to wahyuandikaputra.my.id
    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://wahyuandikaputra.my.id/",
      "_blank",
      "noopener,noreferrer"
    );

    // Modal should now be closed
    expect(screen.queryByRole("dialog")).toBeNull();

    // HD badge should now show "HD Siap"
    expect(screen.getByText("HD Siap")).toBeInTheDocument();
  });
});
