import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "../../components/admin/DataTable";
import { EmptyState } from "../../components/admin/EmptyState";
import { FormError } from "../../components/admin/FormError";
import { LoadingState } from "../../components/admin/LoadingState";
import { Button } from "../../components/ui/button";
import { adminApi } from "../../lib/adminApi";

const pageSize = 25;

const sensitiveKeys = new Set(["apiKey", "api_key", "apiKeyEncrypted", "api_key_encrypted"]);

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, childValue]) => [
      key,
      sensitiveKeys.has(key) ? "[redacted]" : redactValue(childValue)
    ])
  );
}

function safeJson(value: Record<string, unknown> | null): string {
  if (value === null) {
    return "";
  }

  return JSON.stringify(redactValue(value));
}

export function AuditLogsPage() {
  const [offset, setOffset] = useState(0);
  const logs = useQuery({
    queryKey: ["admin", "audit-logs", offset],
    queryFn: () => adminApi.listAuditLogs({ limit: pageSize, offset })
  });

  if (logs.isLoading) {
    return <LoadingState />;
  }

  const logRows = logs.data?.logs ?? [];

  return (
    <section>
      <AdminNoIndex title="Audit Logs" />
      <AdminPageHeader title="Audit Logs" description="Read-only admin audit events with hashed identity fields." />
      {logs.error ? <FormError error={logs.error} /> : null}
      {logRows.length ? (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeader>Action</DataTableHeader>
              <DataTableHeader>Resource</DataTableHeader>
              <DataTableHeader>Admin Email Hash</DataTableHeader>
              <DataTableHeader>IP Hash</DataTableHeader>
              <DataTableHeader>Old</DataTableHeader>
              <DataTableHeader>New</DataTableHeader>
              <DataTableHeader>Created</DataTableHeader>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {logRows.map((log) => (
              <tr key={log.id}>
                <DataTableCell>{log.action}</DataTableCell>
                <DataTableCell>
                  <div>{log.resource_type}</div>
                  <div className="text-xs text-slate-500">{log.resource_id ?? ""}</div>
                </DataTableCell>
                <DataTableCell>{log.admin_email_hash}</DataTableCell>
                <DataTableCell>{log.ip_hash}</DataTableCell>
                <DataTableCell>
                  <pre className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs">
                    {safeJson(log.old_value)}
                  </pre>
                </DataTableCell>
                <DataTableCell>
                  <pre className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs">
                    {safeJson(log.new_value)}
                  </pre>
                </DataTableCell>
                <DataTableCell>{formatDate(log.created_at)}</DataTableCell>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      ) : (
        <EmptyState label="No audit logs found." />
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-600">Offset {offset}</span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - pageSize))}>
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={logRows.length < pageSize}
            onClick={() => setOffset((value) => value + pageSize)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
