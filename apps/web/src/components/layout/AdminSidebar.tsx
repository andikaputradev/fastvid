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
  SlidersHorizontal
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

export function AdminSidebar() {
  return (
    <aside className="border-r border-border bg-white">
      <div className="border-b border-border px-4 py-4">
        <div className="text-lg font-bold text-slate-950">VidSaveID</div>
        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          Admin Console
        </div>
      </div>
      <nav className="grid gap-1 px-2 py-3 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/admin"}
            className={({ isActive }) =>
              cn(
                "flex min-h-10 items-center gap-3 rounded-md px-3 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                isActive && "bg-teal-50 text-primary"
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
