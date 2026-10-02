import { Link } from "react-router-dom";
import { MetaTags } from "../../components/seo/MetaTags";
import type { SeoLandingPageConfig } from "../../lib/landingPages";
import { getPublicSeoRoute } from "../../lib/publicSeoRoutes";
import { canonicalUrl } from "../../lib/seo";

export function SeoLandingPage({ config }: { config: SeoLandingPageConfig }) {
  const seo = getPublicSeoRoute(config.path);

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <MetaTags
        title={config.title}
        description={config.metaDescription}
        canonical={canonicalUrl(config.path)}
        jsonLd={seo.jsonLd?.()}
      />
      <nav className="mb-5 text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400">
          Home
        </Link>{" "}
        / {config.h1}
      </nav>
      <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">{config.h1}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-700 dark:text-slate-300">{config.intro}</p>
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Manfaat utama</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2 dark:text-slate-300">
          {config.benefits.map((benefit) => (
            <li
              key={benefit}
              className="rounded-xl border border-border bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              {benefit}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Cara menggunakan FastVid</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {config.howToSteps.map((step, index) => (
            <li key={step}>
              {index + 1}. {step}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">FAQ</h2>
        <div className="mt-4 grid gap-3">
          {config.faq.map((item) => (
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
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Halaman terkait</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {config.relatedLinks.map((item) => (
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
      <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {config.disclaimer}
      </section>
    </article>
  );
}
