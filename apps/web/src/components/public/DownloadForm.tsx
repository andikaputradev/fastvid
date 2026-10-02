import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { publicUrlSchema } from "@vidsaveid/shared";
import { useDownload } from "../../hooks/useDownload";
import { Button } from "../ui/button";
import { PlatformDetector } from "./PlatformDetector";
import { ResultCard } from "./ResultCard";
import { UrlInput } from "./UrlInput";

const downloadFormSchema = z.object({
  url: publicUrlSchema
});

type DownloadFormInput = z.infer<typeof downloadFormSchema>;

const quickPlatforms = [
  { name: "TikTok", example: "https://vt.tiktok.com/..." },
  { name: "Instagram", example: "https://www.instagram.com/reel/..." },
  { name: "YouTube", example: "https://youtube.com/shorts/..." },
  { name: "Facebook", example: "https://www.facebook.com/watch/..." },
  { name: "Twitter / X", example: "https://x.com/.../status/..." }
];

export function DownloadForm() {
  const download = useDownload();
  const form = useForm<DownloadFormInput>({
    resolver: zodResolver(downloadFormSchema),
    defaultValues: {
      url: ""
    }
  });

  const watchedUrl = useWatch({
    control: form.control,
    name: "url"
  });

  const handlePaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          form.setValue("url", text.trim(), { shouldValidate: true });
          return;
        }
      }
    } catch {
      // If clipboard permission is denied, focus input
    }
    const inputEl = document.getElementById("download-url");
    if (inputEl) {
      inputEl.focus();
    }
  };

  const handleClear = () => {
    form.setValue("url", "");
    form.clearErrors("url");
  };

  const handleReset = () => {
    form.setValue("url", "");
    form.clearErrors("url");
    download.reset();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          download.mutate({ url: values.url });
        })}
      >
        <UrlInput
          registration={form.register("url")}
          error={form.formState.errors.url}
          hasValue={Boolean(watchedUrl && watchedUrl.length > 0)}
          onClear={handleClear}
          onPaste={handlePaste}
        />

        <PlatformDetector url={watchedUrl} />

        {/* Quick Platform suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">Format:</span>
          {quickPlatforms.map((p) => (
            <span
              key={p.name}
              className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              {p.name}
            </span>
          ))}
        </div>

        <Button
          type="submit"
          className="h-13 w-full text-base"
          disabled={download.isPending}
        >
          {download.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>Memproses Link...</span>
            </>
          ) : (
            <>
              <Download className="h-5 w-5" aria-hidden="true" />
              <span>Download / Validasi Link</span>
            </>
          )}
        </Button>
      </form>

      {/* Result Card or status */}
      <ResultCard
        result={download.data}
        error={download.error}
        onReset={handleReset}
      />
    </div>
  );
}
