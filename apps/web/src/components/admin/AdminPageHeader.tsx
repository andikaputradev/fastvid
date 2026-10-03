import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  actions?: ReactNode;
  description?: string;
  title: string;
}

export function AdminPageHeader({ actions, description, title }: AdminPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
