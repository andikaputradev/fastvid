import { Link } from "react-router-dom";
import { PlatformGrid } from "../../components/public/PlatformGrid";
import { MetaTags } from "../../components/seo/MetaTags";
import { getPublicSeoRoute } from "../../lib/publicSeoRoutes";
import { canonicalUrl } from "../../lib/seo";
import { platformsSeoContent } from "../../lib/seoContent";

export function SupportedPlatformsPage() {
  const seo = getPublicSeoRoute("/platforms");

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <MetaTags
        title={seo.title}
        description={seo.description}
        canonical={canonicalUrl("/platforms")}
        jsonLd={seo.jsonLd?.()}
      />
      <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Platform yang Didukung</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{platformsSeoContent.intro}</p>
      <div className="mt-6">
        <PlatformGrid />
      </div>
      <section className="mt-8 rounded-2xl border border-border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Cara membaca status platform</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {platformsSeoContent.howToSteps.map((step, index) => (
            <li key={step}>
              {index + 1}. {step}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Halaman terkait</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {platformsSeoContent.relatedLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:border-teal-500 hover:text-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-400 dark:hover:text-teal-400"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">FAQ</h2>
        <div className="mt-4 grid gap-3">
          {platformsSeoContent.faq.map((item) => (
            <details
              key={item.question}
              className="rounded-xl border border-border bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <summary className="cursor-pointer font-semibold text-slate-950 dark:text-white">{item.question}</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {platformsSeoContent.disclaimer}
      </section>
    </section>
  );
}
