import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";

const legalLinks = [
  { href: "/terms", label: "Syarat & Ketentuan" },
  { href: "/privacy", label: "Kebijakan Privasi" },
  { href: "/dmca", label: "DMCA" },
  { href: "/contact", label: "Kontak" }
];

const featureLinks = [
  { href: "/download-video-sosmed", label: "Download Sosmed" },
  { href: "/download-video-tanpa-login", label: "Tanpa Login" },
  { href: "/video-downloader-online", label: "Downloader Online" },
  { href: "/platforms", label: "Platform" },
  { href: "/faq", label: "FAQ" }
];

const linkClass =
  "text-sm text-slate-600 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-400";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-5 w-7 text-brand-600 dark:text-brand-400" />
              <span className="display text-2xl">FastVid</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
              Web utility pemrosesan link video publik oleh Wahyu Andika Putra.
            </p>
            <p className="mt-3 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">
              FastVid hanya ditujukan untuk konten publik atau konten yang pengguna punya izin untuk akses. FastVid tidak menyimpan file video di server dan tidak berafiliasi dengan platform sosial media mana pun.
            </p>
          </div>

          <nav aria-label="Navigasi footer">
            <h2 className="text-sm font-bold">Navigasi Utama</h2>
            <ul className="mt-4 space-y-2.5">
              {featureLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Hukum dan kebijakan">
            <h2 className="text-sm font-bold">Hukum & Kebijakan</h2>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs text-slate-500 dark:text-slate-400">
          © {currentYear} FastVid by Wahyu Andika Putra. Hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
