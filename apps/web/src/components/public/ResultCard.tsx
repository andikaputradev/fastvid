import { CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { PublicApiError, type DownloadResponse } from "../../lib/api";
import { DownloadOptionList } from "./DownloadOptionList";

interface ResultCardProps {
  error?: Error | null | undefined;
  onReset?: () => void;
  result?: DownloadResponse | undefined;
}

function safeErrorMessage(error: Error): string {
  if (error instanceof PublicApiError) {
    return error.message;
  }

  return "Link tidak dapat diproses saat ini.";
}

function formatDuration(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function ResultCard({ error, onReset, result }: ResultCardProps) {
  if (error) {
    return (
      <div
        className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        role="alert"
      >
        <p className="font-bold">Gagal Memproses Link</p>
        <p className="mt-1 text-xs leading-5">{safeErrorMessage(error)}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-slate-50/60 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        Tempel link video publik dari TikTok, Instagram, YouTube, Facebook, atau Twitter/X untuk memulai unduhan.
      </div>
    );
  }

  const hasMedia = Array.isArray(result.media) && result.media.length > 0;

  if (hasMedia) {
    const duration = formatDuration(result.duration);

    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/60 dark:bg-slate-850">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Video Berhasil Diproses</span>
          {result.platform ? (
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {result.platform}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {result.thumbnailUrl ? (
            <div className="shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 sm:w-36">
              <img
                src={result.thumbnailUrl}
                alt={result.title || "Video thumbnail"}
                className="aspect-video w-full object-cover sm:h-24 sm:w-36"
                loading="lazy"
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm font-bold text-slate-950 dark:text-white">
              {result.title || "Media Siap Diunduh"}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              {result.author ? <span>Kreator: @{result.author}</span> : null}
              {result.author && duration ? <span>•</span> : null}
              {duration ? <span>Durasi: {duration}</span> : null}
            </div>
          </div>
        </div>

        <DownloadOptionList result={result} />

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>File diunduh langsung ke perangkat. Server tidak menyimpan berkas video.</span>
          </div>

          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Video Lain</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="font-bold">{result.message ?? "Status Pemrosesan"}</p>
      <DownloadOptionList result={result} />
    </div>
  );
}
