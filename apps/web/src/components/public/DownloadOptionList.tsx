import { Download, FileImage, Music, Sparkles, Video } from "lucide-react";
import { useState } from "react";
import type { DownloadResponse } from "../../lib/api";
import { handleAdCloseRedirect, isHdQuality, triggerBrowserDownload } from "../../lib/adRedirect";
import { getApiBaseUrl } from "../../lib/env";
import { DownloadAdModal, type PendingDownloadItem } from "../ads/DownloadAdModal";

interface DownloadOptionListProps {
  result: DownloadResponse;
}

function formatBytes(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function DownloadOptionList({ result }: DownloadOptionListProps) {
  const [unlockedUrls, setUnlockedUrls] = useState<Set<string>>(() => new Set());
  const [pendingHdItem, setPendingHdItem] = useState<PendingDownloadItem | null>(null);

  const mediaItems = result.media ?? [];

  if (mediaItems.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-semibold">{result.code ?? "STATUS_READY"}</p>
        <p className="mt-1 text-xs leading-5">
          {result.message ??
            "Opsi download belum tersedia sampai provider resmi diaktifkan. Tidak ada panggilan ke platform sosial media dari antarmuka ini."}
        </p>
      </div>
    );
  }

  const handleHdClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: { url: string; quality: string; format: string },
    downloadHref: string
  ) => {
    if (unlockedUrls.has(item.url)) {
      // Already viewed ad and unlocked, proceed with standard direct download
      return;
    }

    e.preventDefault();
    setPendingHdItem({
      downloadHref,
      format: item.format,
      quality: item.quality,
      url: item.url
    });
  };

  const handleCloseAndDownload = () => {
    if (!pendingHdItem) return;

    const { downloadHref, url } = pendingHdItem;

    // 1. Mark as unlocked for future clicks
    setUnlockedUrls((prev) => new Set([...prev, url]));

    // 2. Close modal state
    setPendingHdItem(null);

    // 3. Redirect to the requested sponsor website on ad close
    handleAdCloseRedirect();

    // 4. Trigger the actual browser file download
    triggerBrowserDownload(downloadHref);
  };

  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Pilihan Unduhan ({mediaItems.length})
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {mediaItems.map((item, index) => {
          const isAudio =
            item.format === "mp3" ||
            item.format === "m4a" ||
            item.format === "wav" ||
            item.format === "aac" ||
            item.format === "ogg";
          const isImage =
            item.format === "image" ||
            item.format === "jpg" ||
            item.format === "jpeg" ||
            item.format === "png" ||
            item.format === "webp";
          const formattedSize = formatBytes(item.sizeBytes);
          const rawUrl = item.url;
          const downloadHref = rawUrl.startsWith("/")
            ? `${getApiBaseUrl()}${rawUrl}`
            : rawUrl;

          const isHd = isHdQuality(item, mediaItems);
          const isUnlocked = unlockedUrls.has(item.url);

          return (
            <a
              key={`${item.url}-${index}`}
              href={downloadHref}
              rel="noopener noreferrer"
              download
              onClick={(e) => {
                if (isHd && !isUnlocked) {
                  handleHdClick(e, item, downloadHref);
                }
              }}
              className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xs transition hover:border-teal-500 hover:bg-teal-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:bg-teal-950/30"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isAudio
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      : isImage
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400"
                        : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400"
                  }`}
                >
                  {isAudio ? (
                    <Music className="h-5 w-5" />
                  ) : isImage ? (
                    <FileImage className="h-5 w-5" />
                  ) : (
                    <Video className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5 truncate text-xs font-bold text-slate-900 dark:text-white">
                    <span>{item.quality}</span>
                    {isHd ? (
                      isUnlocked ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          HD Siap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <Sparkles className="h-2.5 w-2.5" />
                          HD Iklan
                        </span>
                      )
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">
                      {item.format}
                    </span>
                    {formattedSize ? ` • ${formattedSize}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500">
                <Download className="h-3.5 w-3.5" />
                <span>Unduh</span>
              </div>
            </a>
          );
        })}
      </div>

      <DownloadAdModal
        item={pendingHdItem}
        onCloseAndDownload={handleCloseAndDownload}
      />
    </div>
  );
}
