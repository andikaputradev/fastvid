interface EmptyStateProps {
  label: string;
}

export function EmptyState({ label }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
