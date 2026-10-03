import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "../ui/button";

export function RouteErrorBoundary() {
  const error = useRouteError();

  let title = "Terjadi Kesalahan";
  let message = "Terjadi kendala saat memuat halaman ini. Silakan muat ulang halaman.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Halaman Tidak Ditemukan";
      message = "Halaman yang Anda tuju tidak ditemukan atau telah dipindahkan.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    if (
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch dynamically imported module")
    ) {
      title = "Pembaruan Versi Terdeteksi";
      message = "Versi baru aplikasi telah tersedia. Silakan muat ulang halaman untuk memperbarui.";
    }
  }

  function handleReload() {
    window.location.reload();
  }

  function handleGoHome() {
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={handleReload}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Muat Ulang Halaman
          </Button>
          <Button variant="secondary" onClick={handleGoHome}>
            <Home className="h-4 w-4" aria-hidden="true" />
            Ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
