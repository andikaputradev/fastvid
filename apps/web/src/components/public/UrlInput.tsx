import { ClipboardPaste, X } from "lucide-react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface UrlInputProps {
  error?: FieldError | undefined;
  hasValue?: boolean;
  onClear?: () => void;
  onPaste?: () => void;
  registration: UseFormRegisterReturn;
}

export function UrlInput({ error, hasValue, onClear, onPaste, registration }: UrlInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label
          htmlFor="download-url"
          className="text-sm font-bold"
        >
          URL video publik
        </label>
        {onPaste ? (
          <button
            type="button"
            onClick={onPaste}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tempel Link</span>
          </button>
        ) : null}
      </div>

      <div className="relative mt-2">
        <input
          id="download-url"
          type="url"
          autoComplete="url"
          placeholder="Tempel link TikTok, Instagram, YouTube, FB, Twitter/X di sini..."
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "download-url-error" : undefined}
          className="h-13 w-full rounded-xl border border-slate-300 bg-background px-4 pr-12 text-base text-foreground outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/25 dark:border-slate-700"
          {...registration}
        />

        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Hapus teks URL"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          id="download-url-error"
          className="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
          role="alert"
        >
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
