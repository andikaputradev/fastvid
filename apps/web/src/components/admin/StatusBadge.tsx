import { cn } from "../../lib/utils";

const badgeStyles: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400",
  blocked: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400",
  failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400",
  inactive: "border-border bg-muted/60 text-muted-foreground",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400",
  rate_limited: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400"
};

interface StatusBadgeProps {
  value: string | null | undefined;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value ?? "unknown";

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        badgeStyles[normalized] ?? "border-border bg-card text-muted-foreground"
      )}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}
