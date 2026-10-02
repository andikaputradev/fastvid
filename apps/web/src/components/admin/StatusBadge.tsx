import { cn } from "../../lib/utils";

const badgeStyles: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  inactive: "border-slate-200 bg-slate-50 text-slate-600",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700",
  rate_limited: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

interface StatusBadgeProps {
  value: string | null | undefined;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value ?? "unknown";

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-semibold",
        badgeStyles[normalized] ?? "border-slate-200 bg-white text-slate-600"
      )}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}
