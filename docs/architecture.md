# Architecture

VidSaveID is a Turborepo monorepo using pnpm workspaces.

- `apps/web`: React 18 + Vite 5 frontend for public pages and admin screens.
- `apps/api`: Fastify v4 API for public endpoints, admin endpoints, and internal health.
- `packages/shared`: shared TypeScript types, constants, and Zod validators.
- `packages/db`: Drizzle ORM schema for Supabase PostgreSQL.
- `packages/security`: reusable URL, SSRF, hashing, allowlist, and encryption helpers.
- `packages/config`: shared ESLint, TypeScript, and Prettier configuration.

Downloader providers are intentionally absent from the initial scaffold.
