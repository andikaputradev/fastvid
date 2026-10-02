import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/platforms", label: "Platform" },
  { href: "/#cara-pakai", label: "Cara Pakai" },
  { href: "/#faq", label: "FAQ" },
  { href: "/contact", label: "Kontak" }
];

function isCurrent(href: string, isActive: boolean): boolean {
  return isActive && !href.includes("#");
}

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <NavLink to="/" className="flex items-center gap-2.5">
          <BrandMark className="h-5 w-7 text-brand-600 dark:text-brand-400" />
          <span className="display text-2xl">FastVid</span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-foreground dark:text-slate-300",
                  isCurrent(item.href, isActive) &&
                    "text-foreground underline decoration-brand-600 decoration-2 underline-offset-[10px]"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-slate-700 transition-colors hover:bg-muted md:hidden dark:text-slate-300"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col" aria-label="Navigasi mobile">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex h-12 items-center border-b border-border text-base font-medium text-slate-700 last:border-b-0 dark:text-slate-300",
                    isCurrent(item.href, isActive) && "font-bold text-brand-700 dark:text-brand-400"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
