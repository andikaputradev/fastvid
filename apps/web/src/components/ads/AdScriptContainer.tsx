import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

interface AdScriptContainerProps {
  adCode: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdScriptContainer({ adCode, className }: AdScriptContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isAdSense = adCode.includes("adsbygoogle");

  useEffect(() => {
    if (!isAdSense || !containerRef.current) {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense push safe catch
    }
  }, [adCode, isAdSense]);

  if (isAdSense) {
    return (
      <div
        ref={containerRef}
        className={cn("w-full overflow-hidden text-center", className)}
        dangerouslySetInnerHTML={{ __html: adCode }}
      />
    );
  }

  const iframeContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <base target="_blank">
    <style>
      body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; overflow: hidden; font-family: sans-serif; }
      img { max-width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    ${adCode}
  </body>
</html>
  `.trim();

  return (
    <iframe
      title="Advertisement"
      srcDoc={iframeContent}
      sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
      loading="lazy"
      className={cn("w-full border-none overflow-hidden", className)}
      style={{ minHeight: "90px" }}
    />
  );
}
