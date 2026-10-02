import { CheckCircle2, Globe } from "lucide-react";
import { useMemo } from "react";
import { usePlatforms } from "../../hooks/usePlatforms";

interface PlatformDetectorProps {
  url: string;
}

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function PlatformDetector({ url }: PlatformDetectorProps) {
  const platforms = usePlatforms();
  const hostname = hostnameFromUrl(url);
  const detected = useMemo(() => {
    if (!hostname || !platforms.data?.platforms.length) {
      return null;
    }

    return platforms.data.platforms.find((platform) => {
      const slug = platform.slug.toLowerCase();
      return (
        hostname.includes(slug === "twitter" ? "twitter" : slug) ||
        (slug === "twitter" && hostname.includes("x.com")) ||
        (slug === "tiktok" && (hostname.includes("tiktok.com") || hostname.includes("tiktokv.com")))
      );
    });
  }, [hostname, platforms.data?.platforms]);

  if (!url || !hostname) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {detected ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Platform terdeteksi: <strong className="text-slate-950 dark:text-white">{detected.name}</strong></span>
        </>
      ) : (
        <>
          <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>Platform akan divalidasi oleh sistem saat pemrosesan.</span>
        </>
      )}
    </div>
  );
}
