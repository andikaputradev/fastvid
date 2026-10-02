# Security

Security defaults for this scaffold:

- Public URL input must pass Zod validation, URL sanitization, SSRF guard, domain allowlist, and rate limit checks.
- Downloader providers are not implemented yet, and no outbound provider calls are made.
- Request logs must use hashes for IP, User-Agent, and submitted URL values.
- API keys must be encrypted before storage.
- Secrets must stay server-side and must not be exposed to the frontend.
- Admin mutations require authentication and CSRF protection.

TODO SECURITY: add DNS-resolution SSRF checks before any future outbound URL fetch is introduced.
