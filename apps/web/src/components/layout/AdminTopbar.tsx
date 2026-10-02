import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminLogout, useAdminSession } from "../../hooks/useAdminAuth";
import { Button } from "../ui/button";
import { ThemeToggle } from "./ThemeToggle";

export function AdminTopbar() {
  const navigate = useNavigate();
  const session = useAdminSession();
  const logout = useAdminLogout();

  return (
    <header className="border-b border-border bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4">
        <div>
          <Link
            to="/"
            className="text-sm font-semibold text-slate-700 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400"
          >
            Public Site
          </Link>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {session.data?.emailHash ? `Admin ${session.data.emailHash.slice(0, 10)}...` : "Admin"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            type="button"
            variant="secondary"
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
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
