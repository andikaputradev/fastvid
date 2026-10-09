import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { api } from "../../lib/api";
import { AD_REDIRECT_URL } from "../../lib/adRedirect";
import { Button } from "../ui/button";
import { AdScriptContainer } from "./AdScriptContainer";

export interface PendingDownloadItem {
  downloadHref: string;
  format: string;
  quality: string;
  url: string;
}

interface DownloadAdModalProps {
  item: PendingDownloadItem | null;
  onCloseAndDownload: () => void;
}

export function DownloadAdModal({ item, onCloseAndDownload }: DownloadAdModalProps) {
  const { data } = useQuery({
    queryKey: ["public", "ads"],
    queryFn: api.getAds,
    staleTime: 60_000,
    retry: false
  });

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseAndDownload();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onCloseAndDownload]);

  if (!item) {
    return null;
  }

  // Prioritize "popup" slot ad, fallback to any active custom ad or adCode
  const activeAd =
    data?.ads?.find((ad) => ad.slotKey === "popup") ??
    data?.ads?.find((ad) => Boolean(ad.customAd || ad.adCode));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hd-ad-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button ('X') - closing triggers redirect and starts download */}
        <button
          type="button"
          onClick={onCloseAndDownload}
          aria-label="Tutup iklan dan download HD"
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-slate-400 hover:bg-muted hover:text-foreground transition"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Iklan Sponsor Unduhan HD
          </span>
          <span className="text-xs text-muted-foreground">
            {activeAd?.providerName || "Sponsor FastVid"}
          </span>
        </div>

        <h3 id="hd-ad-modal-title" className="text-base font-bold text-foreground mb-1">
          Kualitas Terbaik: {item.quality}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Tonton iklan sponsor berikut sebelum mengunduh format{" "}
          <span className="uppercase font-semibold text-foreground">{item.format}</span>.
        </p>

        {/* Ad Body */}
        <div className="my-3 overflow-hidden rounded-xl border border-border bg-muted/40">
          {activeAd?.adType === "custom" && activeAd.customAd ? (
            <a
              href={activeAd.customAd.targetUrl}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="group block overflow-hidden p-1 transition"
            >
              <img
                src={activeAd.customAd.imageUrl}
                alt={activeAd.customAd.altText || "Iklan Sponsor"}
                className="mx-auto max-h-64 w-full rounded-lg object-contain transition group-hover:scale-[1.01]"
              />
            </a>
          ) : activeAd?.adCode ? (
            <div className="p-2 flex justify-center items-center min-h-[120px]">
              <AdScriptContainer adCode={activeAd.adCode} />
            </div>
          ) : (
            /* Default sponsor card when no ad network is active */
            <div className="p-4 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">
                Disponsori oleh Wahyu Andika Putra
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Dukung pengembangan FastVid dan layanan pengunduh cepat tanpa batas.
              </p>
              <a
                href={AD_REDIRECT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                <span>Kunjungi Situs Pengembang</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 space-y-2">
          <Button onClick={onCloseAndDownload} className="w-full gap-2">
            <Download className="h-4 w-4" />
            <span>Tutup Iklan & Download HD</span>
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Menutup iklan akan membuka tautan sponsor di tab baru dan langsung memulai unduhan file ke perangkat Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
