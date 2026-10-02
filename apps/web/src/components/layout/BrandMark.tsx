interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 28 20" className={className} fill="currentColor" aria-hidden="true">
      <path d="M2 2l11 8L2 18V2z" opacity=".45" />
      <path d="M14 2l11 8-11 8V2z" />
    </svg>
  );
}
