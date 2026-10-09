import { useQuery } from "@tanstack/react-query";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { handleAdCloseRedirect } from "../../lib/adRedirect";
import { Button } from "../ui/button";
import { AdScriptContainer } from "./AdScriptContainer";

const STORAGE_KEY = "fastvid_first_visit_ad_shown";

export function FirstVisitAdModal() {
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["public", "ads"],
    queryFn: api.getAds,
    staleTime: 60_000,
    retry: false
  });

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (!hasSeen) {
        setIsOpen(true);
      }
    } catch {
      // If localStorage is unavailable, do not force popup
      setIsOpen(false);
    }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore localStorage errors
    }
    setIsOpen(false);
    handleAdCloseRedirect();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !data?.ads?.length) {
    return null;
  }

  // Prioritize dedicated "popup" slot, fallback to any active ad
  const activeAd =
    data.ads.find((item) => item.slotKey === "popup") ??
    data.ads.find((item) => Boolean(item.customAd || item.adCode));

  if (!activeAd || (!activeAd.customAd && !activeAd.adCode)) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-visit-ad-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup iklan"
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-slate-400 hover:bg-muted hover:text-foreground transition"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            Pesan Sponsor
          </span>
          <span className="text-xs text-muted-foreground">
            {activeAd.providerName || "Sponsor FastVid"}
          </span>
        </div>

        <h3 id="first-visit-ad-title" className="text-base font-bold text-foreground mb-3">
          Selamat Datang di FastVid
        </h3>

        {/* Ad Body */}
        <div className="my-2 overflow-hidden rounded-xl border border-border bg-muted/40">
          {activeAd.adType === "custom" && activeAd.customAd ? (
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
          ) : activeAd.adCode ? (
            <div className="p-2 flex justify-center items-center min-h-[100px]">
              <AdScriptContainer adCode={activeAd.adCode} />
            </div>
          ) : null}
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <Button onClick={handleClose} className="w-full">
            Lanjutkan ke Website
          </Button>
        </div>
      </div>
    </div>
  );
}
