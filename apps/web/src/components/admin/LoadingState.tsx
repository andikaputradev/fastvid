interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border border-border bg-white p-6 text-sm text-slate-600">
      {label}
    </div>
  );
}
