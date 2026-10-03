import {
  BadgeAlert,
  BarChart3,
  ClipboardList,
  Gauge,
  Home,
  Megaphone,
  Plug,
  Settings,
  Shield,
  SlidersHorizontal,
  X
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const navItems = [
  { href: "/admin", icon: Home, label: "Dashboard" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
  { href: "/admin/platforms", icon: SlidersHorizontal, label: "Platforms" },
  { href: "/admin/providers", icon: Plug, label: "Providers" },
  { href: "/admin/ads", icon: Megaphone, label: "Ads" },
  { href: "/admin/security", icon: Shield, label: "Security" },
  { href: "/admin/request-logs", icon: ClipboardList, label: "Request Logs" },
  { href: "/admin/audit-logs", icon: BadgeAlert, label: "Audit Logs" },
  { href: "/admin/system-status", icon: Gauge, label: "System Status" }
];

export interface AdminSidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function AdminSidebar({ onNavigate, onClose, isMobile }: AdminSidebarProps = {}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card text-card-foreground",
        isMobile ? "w-72" : "w-full"
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-lg font-bold tracking-tight text-foreground">FastVid</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Admin Console
          </div>
        </div>
        {isMobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 text-sm font-medium">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/admin"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
