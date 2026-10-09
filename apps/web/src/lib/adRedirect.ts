export const AD_REDIRECT_URL = "https://wahyuandikaputra.my.id/";

/**
 * Redirects the user to the sponsor / personal website when closing an ad.
 * Attempts to open in a new tab first to preserve the current application state,
 * falling back to window.location.assign if blocked or unavailable.
 */
export function handleAdCloseRedirect(targetUrl: string = AD_REDIRECT_URL): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const opened = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (!opened && typeof window.location !== "undefined") {
      try {
        window.location.assign(targetUrl);
      } catch {
        // Safe fallback in test or restricted environments
      }
    }
  } catch {
    try {
      window.location.assign(targetUrl);
    } catch {
      // Safe fallback in test environments
    }
  }
}

/**
 * Triggers a browser file download programmatically via a temporary anchor element.
 */
export function triggerBrowserDownload(downloadUrl: string): void {
  if (typeof document === "undefined" || !downloadUrl) {
    return;
  }

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.setAttribute("download", "");
  link.setAttribute("rel", "noopener noreferrer");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Checks if a media item represents the best / HD quality option.
 */
export function isHdQuality(
  item: { format: string; quality?: string },
  allItems: Array<{ format: string; quality?: string }>
): boolean {
  const format = (item.format || "").toLowerCase();
  const isAudio = ["mp3", "m4a", "wav", "aac", "ogg"].includes(format);
  const isImage = ["image", "jpg", "jpeg", "png", "webp"].includes(format);

  if (isAudio || isImage) {
    return false;
  }

  const q = (item.quality || "").toLowerCase();
  if (
    q.includes("hd") ||
    q.includes("1080") ||
    q.includes("1440") ||
    q.includes("2160") ||
    q.includes("4k") ||
    q.includes("2k") ||
    q.includes("best")
  ) {
    return true;
  }

  const videoItems = allItems.filter((i) => {
    const f = (i.format || "").toLowerCase();
    return !["mp3", "m4a", "wav", "aac", "ogg", "image", "jpg", "jpeg", "png", "webp"].includes(f);
  });

  const hasExplicitHd = videoItems.some((v) => {
    const vq = (v.quality || "").toLowerCase();
    return (
      vq.includes("hd") ||
      vq.includes("1080") ||
      vq.includes("1440") ||
      vq.includes("2160") ||
      vq.includes("4k") ||
      vq.includes("2k")
    );
  });

  if (!hasExplicitHd && videoItems.length > 0 && videoItems[0] === item) {
    return true;
  }

  return false;
}
