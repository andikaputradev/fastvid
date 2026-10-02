import { useEffect, useState } from "react";
import { usePlatforms } from "../../hooks/usePlatforms";

function statusLabel(status: string): string {
  if (status === "active") {
    return "Aktif";
  }

  if (status === "maintenance") {
    return "Pemeliharaan";
  }

  return "Disiapkan";
}

export function PlatformGrid() {
  const [isHydrated, setIsHydrated] = useState(false);
  const platforms = usePlatforms({ enabled: isHydrated });
  const items = platforms.data?.platforms ?? [];

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (isHydrated && platforms.isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-slate-600 dark:text-slate-300">
        Memuat platform...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-slate-600 dark:text-slate-300">
        Platform sedang disiapkan.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((platform) => (
        <article
          key={platform.slug}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">{platform.name}</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                platform.status === "active"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {statusLabel(platform.status)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300 sm:text-sm">
            {platform.description ?? "Dukungan konten publik sedang disiapkan."}
          </p>
        </article>
      ))}
    </div>
  );
}
