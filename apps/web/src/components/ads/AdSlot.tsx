import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { AdScriptContainer } from "./AdScriptContainer";

interface AdSlotProps {
  className?: string;
  slot: "header" | "in_content" | "sidebar" | "footer" | string;
}

const slotDimensions: Record<string, string> = {
  header: "min-h-[60px] sm:min-h-[90px] max-w-[728px]",
  in_content: "min-h-[120px] max-w-[728px]",
  sidebar: "min-h-[250px] sm:min-h-[600px] max-w-[300px]",
  footer: "min-h-[60px] sm:min-h-[90px] max-w-[728px]"
};

export function AdSlot({ className, slot }: AdSlotProps) {
  const dimensionClass = slotDimensions[slot] ?? "min-h-[60px]";
  const { data } = useQuery({
    queryKey: ["public", "ads"],
    queryFn: api.getAds,
    staleTime: 60_000,
    retry: false
  });

  const ad = data?.ads.find((item) => item.slotKey === slot);

  if (!ad) {
    return null;
  }

  return (
    <aside
      aria-label={`Iklan ${slot}`}
      data-ad-slot={slot}
      className={cn("mx-auto my-6 w-full text-center", className)}
    >
      <p className="mb-1.5 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {ad.adType === "custom" ? "Iklan Sponsor" : "Iklan"}
      </p>

      <div
        id={`ad-slot-${slot}`}
        className={cn(
          "mx-auto flex w-full items-center justify-center overflow-hidden rounded-xl",
          dimensionClass
        )}
      >
        {ad.adType === "custom" && ad.customAd ? (
          <a
            href={ad.customAd.targetUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="group block w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-1 shadow-sm transition hover:border-brand-500/50 hover:shadow-md"
          >
            <img
              src={ad.customAd.imageUrl}
              alt={ad.customAd.altText || "Iklan Sponsor"}
              loading="lazy"
              className="mx-auto h-auto max-h-[250px] w-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.008]"
            />
          </a>
        ) : ad.adCode ? (
          <AdScriptContainer adCode={ad.adCode} />
        ) : null}
      </div>
    </aside>
  );
}
