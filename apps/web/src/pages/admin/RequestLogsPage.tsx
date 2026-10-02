import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "../../components/admin/DataTable";
import { EmptyState } from "../../components/admin/EmptyState";
import { FormError } from "../../components/admin/FormError";
import { LoadingState } from "../../components/admin/LoadingState";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { Button } from "../../components/ui/button";
import { adminApi } from "../../lib/adminApi";

const pageSize = 25;

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export function RequestLogsPage() {
  const [offset, setOffset] = useState(0);
  const logs = useQuery({
    queryKey: ["admin", "request-logs", offset],
    queryFn: () => adminApi.listRequestLogs({ limit: pageSize, offset })
  });

  if (logs.isLoading) {
    return <LoadingState />;
  }

  const logRows = logs.data?.logs ?? [];

  return (
    <section>
      <AdminNoIndex title="Request Logs" />
      <AdminPageHeader title="Request Logs" description="Read-only request log records with hash-only identifiers." />
      {logs.error ? <FormError error={logs.error} /> : null}
      {logRows.length ? (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeader>Request ID</DataTableHeader>
              <DataTableHeader>Platform</DataTableHeader>
              <DataTableHeader>Provider</DataTableHeader>
              <DataTableHeader>Status</DataTableHeader>
              <DataTableHeader>Error</DataTableHeader>
              <DataTableHeader>Latency</DataTableHeader>
              <DataTableHeader>Country</DataTableHeader>
              <DataTableHeader>URL Hash</DataTableHeader>
              <DataTableHeader>IP Hash</DataTableHeader>
              <DataTableHeader>Created</DataTableHeader>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {logRows.map((log) => (
              <tr key={log.id}>
                <DataTableCell>{log.request_id}</DataTableCell>
                <DataTableCell>{log.platform_slug ?? ""}</DataTableCell>
                <DataTableCell>{log.provider_slug ?? ""}</DataTableCell>
                <DataTableCell>
                  <StatusBadge value={log.status} />
                </DataTableCell>
                <DataTableCell>{log.error_code ?? ""}</DataTableCell>
                <DataTableCell>{log.response_time_ms ?? ""}</DataTableCell>
                <DataTableCell>{log.country_code ?? ""}</DataTableCell>
                <DataTableCell>{log.url_hash}</DataTableCell>
                <DataTableCell>{log.ip_hash}</DataTableCell>
                <DataTableCell>{formatDate(log.created_at)}</DataTableCell>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      ) : (
        <EmptyState label="No request logs found." />
      )}
      <PaginationControls
        offset={offset}
        hasNext={logRows.length === pageSize}
        onNext={() => setOffset((value) => value + pageSize)}
        onPrevious={() => setOffset((value) => Math.max(0, value - pageSize))}
      />
    </section>
  );
}

function PaginationControls({
  hasNext,
  offset,
  onNext,
  onPrevious
}: {
  hasNext: boolean;
  offset: number;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-sm text-slate-600">Offset {offset}</span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={offset === 0} onClick={onPrevious}>
          Previous
        </Button>
        <Button type="button" variant="secondary" disabled={!hasNext} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
