import { CheckCircle2, Sparkles } from "lucide-react";
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

const PLATFORM_DOMAIN_MAP: Record<string, string[]> = {
  tiktok: ["tiktok.com", "tiktokv.com", "vt.tiktok.com", "vm.tiktok.com"],
  instagram: ["instagram.com", "instagr.am", "ig.me"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com", "fb.watch", "fb.com"],
  twitter: ["twitter.com", "x.com", "t.co"],
  threads: ["threads.net"],
  pinterest: ["pinterest.com", "pin.it"],
  snackvideo: ["snackvideo.com", "sck.io"],
  likee: ["likee.video"]
};

export function PlatformDetector({ url }: PlatformDetectorProps) {
  const platforms = usePlatforms();
  const hostname = hostnameFromUrl(url);

  const detected = useMemo(() => {
    if (!hostname) {
      return null;
    }

    if (platforms.data?.platforms.length) {
      const activeMatch = platforms.data.platforms.find((platform) => {
        const slug = platform.slug.toLowerCase();
        const domains = PLATFORM_DOMAIN_MAP[slug];
        if (domains) {
          return domains.some(
            (d) => hostname === d || hostname.endsWith(`.${d}`)
          );
        }
        return (
          hostname.includes(slug) ||
          (slug === "twitter" && (hostname.includes("x.com") || hostname.includes("twitter.com"))) ||
          (slug === "tiktok" && hostname.includes("tiktok.com"))
        );
      });

      if (activeMatch) {
        return { name: activeMatch.name, isUniversal: false };
      }

      const universalPlatform = platforms.data.platforms.find(
        (p) => p.slug === "all" || p.slug === "universal"
      );
      if (universalPlatform) {
        return { name: universalPlatform.name, isUniversal: true };
      }
    }

    for (const [key, domains] of Object.entries(PLATFORM_DOMAIN_MAP)) {
      if (domains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        const formattedName =
          key === "twitter"
            ? "Twitter / X"
            : key === "youtube"
              ? "YouTube"
              : key === "tiktok"
                ? "TikTok"
                : key === "snackvideo"
                  ? "SnackVideo"
                  : key.charAt(0).toUpperCase() + key.slice(1);
        return { name: formattedName, isUniversal: false };
      }
    }

    return null;
  }, [hostname, platforms.data?.platforms]);

  if (!url || !hostname) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {detected ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>
            Platform terdeteksi: <strong className="text-slate-950 dark:text-white">{detected.name}</strong>
            {detected.isUniversal ? " (Universal All-Sosmed)" : ""}
          </span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <span>Platform & provider akan dideteksi dan diproses otomatis oleh sistem.</span>
        </>
      )}
    </div>
  );
}
