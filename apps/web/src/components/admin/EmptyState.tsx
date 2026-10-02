interface EmptyStateProps {
  label: string;
}

export function EmptyState({ label }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-border bg-white p-6 text-center text-sm text-slate-600">
      {label}
    </div>
  );
}
