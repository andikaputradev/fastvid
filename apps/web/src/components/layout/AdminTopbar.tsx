import { LogOut, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminLogout, useAdminSession } from "../../hooks/useAdminAuth";
import { Button } from "../ui/button";
import { ThemeToggle } from "./ThemeToggle";

export interface AdminTopbarProps {
  onMenuClick?: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps = {}) {
  const navigate = useNavigate();
  const session = useAdminSession();
  const logout = useAdminLogout();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
          <div>
            <Link
              to="/"
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              Public Site
            </Link>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {session.data?.emailHash ? `Admin ${session.data.emailHash.slice(0, 10)}...` : "Admin"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate(undefined, {
                onSettled() {
                  navigate("/admin/login", { replace: true });
                }
              });
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
