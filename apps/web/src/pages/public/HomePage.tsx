import {
  CheckCircle2,
  Database,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdSlot } from "../../components/ads/AdSlot";
import { HeroSection } from "../../components/public/HeroSection";
import { PlatformGrid } from "../../components/public/PlatformGrid";
import { MetaTags } from "../../components/seo/MetaTags";
import { homeFaqItems } from "../../lib/homeSeo";
import { getPublicSeoRoute } from "../../lib/publicSeoRoutes";
import { canonicalUrl } from "../../lib/seo";
import { homeSeoContent } from "../../lib/seoContent";

export function HomePage() {
  const seo = getPublicSeoRoute("/");

  return (
    <>
      <MetaTags
        title={seo.title}
        description={seo.description}
        canonical={canonicalUrl("/")}
        jsonLd={seo.jsonLd?.()}
      />

      <HeroSection />

      {/* Top Banner Ad Slot */}
      <div className="mx-auto max-w-6xl px-4">
        <AdSlot slot="header" />
      </div>

      {/* Step by step: Cara Pakai */}
      <section id="cara-pakai" className="border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="heading text-3xl sm:text-4xl">
              Cara Download Video Sosmed
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Hanya dengan 3 langkah praktis tanpa perlu login, aplikasi tambahan, atau instalasi ekstensi apa pun.
            </p>
          </div>

          <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {homeSeoContent.howToSteps.map((item, index) => (
              <li
                key={item}
                className="border-t border-border pt-5"
              >
                <div className="display text-5xl text-brand-600 dark:text-brand-400" aria-hidden="true">{index + 1}</div>
                <span className="sr-only">Langkah {index + 1}</span>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Platform Grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-6">
          <h2 className="heading text-3xl sm:text-4xl">
            Platform yang Disiapkan
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            FastVid menampilkan platform publik yang sudah aktif di API. Konten yang bersifat privat atau tidak berizin tidak didukung.
          </p>
        </div>
        <PlatformGrid />
      </section>

      {/* In-Content Ad Slot */}
      <div className="mx-auto max-w-6xl px-4">
        <AdSlot slot="in_content" />
      </div>

      {/* Keunggulan & Keamanan */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="heading text-3xl sm:text-4xl">
              Keamanan, Privasi & Keunggulan
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Dirancang dengan standar privasi ketat untuk menjamin kenyamanan Anda dalam mengunduh media publik.
            </p>
          </div>

          <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
              title="Tanpa Perlu Login"
            >
              {homeSeoContent.benefits[1] ?? "Tidak perlu login akun atau registrasi untuk memakai halaman publik FastVid."}
            </FeatureCard>

            <FeatureCard
              icon={<Database className="h-5 w-5" aria-hidden="true" />}
              title="Zero Storage (Tanpa Simpan File)"
            >
              {homeSeoContent.benefits[2] ?? "FastVid tidak menyimpan berkas video di server kami. Semua file diunduh langsung."}
            </FeatureCard>

            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
              title="Validasi Keamanan Berlapis"
            >
              {homeSeoContent.benefits[3] ?? "URL diproses melalui URL sanitizer, SSRF guard, dan validasi domain ketat."}
            </FeatureCard>

            <FeatureCard
              icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
              title="Kualitas Terbaik & Bebas Watermark"
            >
              Menyediakan pilihan kualitas HD 1080p, 720p, atau audio MP3 jernih tanpa logo watermark bawaan.
            </FeatureCard>

            <FeatureCard
              icon={<Smartphone className="h-5 w-5" aria-hidden="true" />}
              title="Responsif di Semua Perangkat"
            >
              Dapat diakses secara mulus melalui browser di smartphone Android, iPhone iOS, tablet, dan PC desktop.
            </FeatureCard>

            <FeatureCard
              icon={<Zap className="h-5 w-5" aria-hidden="true" />}
              title="Pemrosesan Instan"
            >
              Didukung infrastruktur modern berkecepatan tinggi tanpa batasan jumlah unduhan berkas publik.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Panduan Populer / Internal SEO Links */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="heading text-3xl sm:text-4xl">
            Panduan Populer
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Mulai dari halaman inti FastVid untuk kebutuhan download video sosmed, video downloader online,
            dan simpan video publik dari sosmed secara wajar.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {homeSeoContent.relatedLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 font-semibold transition-colors hover:border-brand-600 hover:text-brand-700 dark:hover:text-brand-400"
              >
                <span>{item.label}</span>
                
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="heading text-3xl sm:text-4xl">
              FAQ (Tanya Jawab)
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
              Jawaban lengkap seputar penggunaan layanan FastVid.
            </p>
          </div>

          <div className="mt-10 border-t border-border">
            {homeFaqItems.map((item) => (
              <details
                key={item.question}
                className="group border-b border-border py-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                  <span>{item.question}</span>
                  <span aria-hidden="true" className="text-2xl font-normal leading-none text-slate-500 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Catatan Kepatuhan */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
            <CheckCircle2 className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            Catatan kepatuhan
          </div>
          <p className="mt-2 text-xs sm:text-sm">
            {homeSeoContent.disclaimer}
          </p>
        </div>
      </section>

      {/* Footer Banner Ad Slot */}
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <AdSlot slot="footer" />
      </div>
    </>
  );
}

function FeatureCard({
  children,
  icon,
  title
}: {
  children: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="border-t border-border pt-5">
      <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400">
        <div className="flex h-9 w-9 items-center justify-center">
          {icon}
        </div>
        <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
        {children}
      </p>
    </article>
  );
}
