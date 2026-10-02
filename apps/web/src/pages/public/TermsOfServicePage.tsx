import { MetaTags } from "../../components/seo/MetaTags";
import { getPublicSeoRoute } from "../../lib/publicSeoRoutes";
import { canonicalUrl } from "../../lib/seo";

export function TermsOfServicePage() {
  const seo = getPublicSeoRoute("/terms");

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <MetaTags title={seo.title} description={seo.description} canonical={canonicalUrl("/terms")} />
      <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Ketentuan Layanan</h1>
      <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
        FastVid hanya ditujukan untuk konten publik dan penggunaan yang mematuhi hukum, hak cipta,
        serta ketentuan platform asal.
      </p>
    </section>
  );
}
