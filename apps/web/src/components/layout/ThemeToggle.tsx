import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeStore, type Theme } from "../../lib/theme";
import { cn } from "../../lib/utils";

const themeOptions: Array<{
  value: Theme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Mode Terang", icon: Sun },
  { value: "dark", label: "Mode Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Monitor }
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();

  return (
    <div
      role="radiogroup"
      aria-label="Pilihan Tema Tampilan"
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-slate-100/80 p-0.5 dark:bg-slate-900/80 dark:border-slate-800",
        className
      )}
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 sm:h-8 sm:w-8",
              isActive
                ? "bg-white text-teal-700 shadow-xs dark:bg-slate-800 dark:text-teal-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
