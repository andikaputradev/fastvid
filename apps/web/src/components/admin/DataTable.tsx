import type { PropsWithChildren, ReactNode } from "react";

interface DataTableProps {
  children: ReactNode;
}

export function DataTable({ children }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-white">
      <table className="min-w-full divide-y divide-border text-left text-sm">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: PropsWithChildren) {
  return <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">{children}</thead>;
}

export function DataTableBody({ children }: PropsWithChildren) {
  return <tbody className="divide-y divide-border text-slate-700">{children}</tbody>;
}

export function DataTableCell({ children }: PropsWithChildren) {
  return <td className="whitespace-nowrap px-4 py-3 align-top">{children}</td>;
}

export function DataTableHeader({ children }: PropsWithChildren) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>;
}
