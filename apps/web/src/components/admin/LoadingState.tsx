interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      {label}
    </div>
  );
}
