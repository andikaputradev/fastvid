# FastVid

FastVid by Wahyu Andika Putra.

Default SEO title: `FastVid - Download Video Sosmed Tanpa Login`

Tagline: Simpan video publik dari berbagai platform dengan cepat, aman, dan praktis.

## Stack

- Turborepo + pnpm workspace
- React 18, TypeScript, Vite 5, Tailwind CSS v3
- React Router v6, TanStack Query v5, Zustand v4
- React Hook Form + Zod
- Node.js 20 LTS, Fastify v4
- Drizzle ORM with Supabase PostgreSQL

## Workspace

- `apps/web`: public and admin frontend scaffold
- `apps/api`: Fastify API scaffold
- `packages/shared`: shared types, constants, and validators
- `packages/db`: Drizzle schema and seed scaffold
- `packages/security`: shared security utilities
- `packages/config`: shared ESLint, TypeScript, and Prettier config

## Commands

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm db:migrate
```

For the web app, `pnpm --filter @vidsaveid/web build` runs Vite, prerenders public SEO routes, regenerates `dist/sitemap.xml` and `dist/robots.txt`, then runs `seo:check`.

```bash
pnpm --filter @vidsaveid/web prerender
pnpm --filter @vidsaveid/web seo:check
```

## CI

GitHub Actions runs on pull requests and pushes to `main` with Node.js 20 and pnpm via Corepack:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

CI uses dummy non-production values for required build/test secrets. Live database seed verification, API smoke, admin bootstrap, and admin smoke workflows are manual/local because they require real environment configuration.

## Public SEO

Public routes currently intended for indexing:

- `/`
- `/platforms`
- `/download-video-sosmed`
- `/download-video-tiktok`
- `/download-video-instagram`
- `/download-video-facebook`
- `/download-video-twitter`
- `/download-video-pinterest`
- `/cara-download-video-sosmed`
- `/download-video-tanpa-login`
- `/video-downloader-online`
- `/simpan-video-publik`
- `/faq`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/dmca`

Build output:

- Static HTML is written to `apps/web/dist/index.html` and each public route directory, for example `apps/web/dist/download-video-tiktok/index.html`.
- Sitemap output is `apps/web/dist/sitemap.xml`.
- Robots output is `apps/web/dist/robots.txt`.

Search Console checklist before production launch:

- Set `VITE_SITE_URL` to `https://fastvid.my.id`.
- Verify `robots.txt` disallows `/admin/`.
- Verify domain ownership in Google Search Console for `fastvid.my.id`.
- Submit `https://fastvid.my.id/sitemap.xml`.
- Inspect the homepage URL.
- Inspect the landing page and supporting SEO guide URLs.
- Monitor indexing and performance reports.
- Treat ranking as an outcome to monitor, not a guarantee from content or markup alone.
- Keep content compliant: do not claim support for restricted content access, platform circumvention, or unsupported provider behavior.
- Keep admin pages `noindex,nofollow`.
- Keep live DB seed verification, API smoke, and admin smoke commands manual/local with real environment values.

## Deployment

Production deployment targets are documented in `docs/deployment.md`:

- Frontend: Vercel (or Cloudflare Pages) from `apps/web`, output `apps/web/dist`, domain `https://fastvid.my.id`.
- Backend API: Render / Railway / Fastify Server from `apps/api`, start command `pnpm --filter @vidsaveid/api start`.
- Database: Supabase PostgreSQL.

Only `VITE_API_BASE_URL` and `VITE_SITE_URL` belong in frontend public env. Backend secrets such as `DATABASE_URL`, Supabase service role key, hash secrets, encryption keys, and admin session secrets must stay on the API/server side.

Before buying a domain or deploying, run the local production simulation in `docs/local-production-check.md`.
