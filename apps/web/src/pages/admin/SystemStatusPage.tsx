import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { FormError } from "../../components/admin/FormError";
import { LoadingState } from "../../components/admin/LoadingState";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { adminApi } from "../../lib/adminApi";

export function SystemStatusPage() {
  const health = useQuery({
    queryKey: ["admin", "health"],
    queryFn: adminApi.health
  });
  const status = useQuery({
    queryKey: ["admin", "status"],
    queryFn: adminApi.status
  });

  if (health.isLoading || status.isLoading) {
    return <LoadingState />;
  }

  return (
    <section>
      <AdminNoIndex title="System Status" />
      <AdminPageHeader title="System Status" description="Basic health and public API status." />
      {health.error ? <FormError error={health.error} /> : null}
      {status.error ? <FormError error={status.error} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health</h2>
          </div>
          <div className="mt-4 text-2xl font-bold text-foreground">{health.data?.status ?? "unknown"}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public Status</h2>
          <div className="mt-4">
            <StatusBadge value={status.data?.status ?? "unknown"} />
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Providers enabled: {status.data?.providersEnabled ? "yes" : "no"}
          </div>
        </div>
      </div>
    </section>
  );
}
