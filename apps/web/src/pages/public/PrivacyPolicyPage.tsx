import { MetaTags } from "../../components/seo/MetaTags";
import { getPublicSeoRoute } from "../../lib/publicSeoRoutes";
import { canonicalUrl } from "../../lib/seo";

export function PrivacyPolicyPage() {
  const seo = getPublicSeoRoute("/privacy");

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <MetaTags title={seo.title} description={seo.description} canonical={canonicalUrl("/privacy")} />
      <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Kebijakan Privasi</h1>
      <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">
        Scaffold ini dirancang agar URL, IP, User-Agent, dan API key tidak disimpan dalam bentuk
        plaintext.
      </p>
    </section>
  );
}
