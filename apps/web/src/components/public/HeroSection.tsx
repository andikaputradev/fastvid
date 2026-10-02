import { DownloadForm } from "./DownloadForm";

export function HeroSection() {
  return (
    <section className="border-b border-border">
      <div className="hero-rise mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16 lg:pb-20 lg:pt-24">
        <h1 className="display max-w-4xl text-5xl sm:text-6xl lg:text-7xl">
          Download Video Sosmed Tanpa Login
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          Simpan video publik dari TikTok, Instagram, YouTube, Facebook, dan Twitter/X secara instan, aman, dan tanpa watermark.
        </p>
        <div className="mt-10 max-w-3xl">
          <DownloadForm />
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Gratis dan tanpa registrasi, berjalan di browser HP maupun laptop. Gunakan hanya untuk konten publik atau konten yang Anda berhak mengaksesnya.
        </p>
      </div>
    </section>
  );
}
