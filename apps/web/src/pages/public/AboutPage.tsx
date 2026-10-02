import { MetaTags } from "../../components/seo/MetaTags";
import { getPublicSeoRoute } from "../../lib/publicSeoRoutes";
import { canonicalUrl } from "../../lib/seo";

export function AboutPage() {
  const seo = getPublicSeoRoute("/about");

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <MetaTags title={seo.title} description={seo.description} canonical={canonicalUrl("/about")} />
      <h1 className="text-3xl font-bold text-slate-950 dark:text-white">FastVid</h1>
      <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
        FastVid by Wahyu Andika Putra adalah layanan terpercaya untuk menyimpan video publik dari berbagai
        sosial media secara cepat, aman, dan tanpa login.
      </p>
    </section>
  );
}
