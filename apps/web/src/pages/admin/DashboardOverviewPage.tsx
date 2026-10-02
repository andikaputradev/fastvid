import { useQuery } from "@tanstack/react-query";
import { Activity, Megaphone, Plug, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { FormError } from "../../components/admin/FormError";
import { LoadingState } from "../../components/admin/LoadingState";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { adminApi } from "../../lib/adminApi";

export function DashboardOverviewPage() {
  const status = useQuery({
    queryKey: ["admin", "status"],
    queryFn: adminApi.status
  });
  const platforms = useQuery({
    queryKey: ["admin", "platforms"],
    queryFn: adminApi.listPlatforms
  });
  const providers = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: adminApi.listProviders
  });
  const ads = useQuery({
    queryKey: ["admin", "ads"],
    queryFn: adminApi.listAds
  });

  const platformRows = platforms.data?.platforms ?? [];
  const providerRows = providers.data?.providers ?? [];
  const adRows = ads.data?.ads ?? [];
  const activePlatforms = platformRows.filter((platform) => platform.is_active).length;
  const activeProviders = providerRows.filter((provider) => provider.is_active).length;
  const activeAds = adRows.filter((ad) => ad.is_active).length;

  return (
    <section>
      <AdminNoIndex title="Dashboard" />
      <AdminPageHeader title="Dashboard" description="Operational snapshot for the FastVid admin API." />
      {status.error ? <FormError error={status.error} /> : null}
      {platforms.error ? <FormError error={platforms.error} /> : null}
      {providers.error ? <FormError error={providers.error} /> : null}
      {ads.error ? <FormError error={ads.error} /> : null}
      {status.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            icon={<Activity className="h-5 w-5" aria-hidden="true" />}
            label="Site Status"
            value={<StatusBadge value={status.data?.status ?? "unknown"} />}
          />
          <OverviewCard
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            label="Active Platforms"
            value={`${activePlatforms}/${platformRows.length}`}
          />
          <OverviewCard
            icon={<Plug className="h-5 w-5" aria-hidden="true" />}
            label="Active Providers"
            value={`${activeProviders}/${providerRows.length}`}
          />
          <OverviewCard
            icon={<Megaphone className="h-5 w-5" aria-hidden="true" />}
            label="Active Ad Slots"
            value={`${activeAds}/${adRows.length}`}
          />
        </div>
      )}
      <div className="mt-5 rounded-md border border-border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-950">Maintenance</h2>
        <div className="mt-2 text-sm text-slate-600">
          {status.data?.maintenanceMode ? status.data.maintenanceMessage ?? "Maintenance mode is active." : "Inactive"}
        </div>
      </div>
    </section>
  );
}

function OverviewCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-primary">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="mt-4 text-2xl font-bold text-slate-950">{value}</div>
    </div>
  );
}
