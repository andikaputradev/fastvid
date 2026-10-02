# Provider Guide

Provider integrations are intentionally not implemented.

Future provider work must:

- Use documented, compliant provider APIs.
- Avoid scraping bypasses, anti-detection, DRM bypass, cookie login, token extraction, and private-content access.
- Process only public URLs.
- Pass sanitizer, SSRF guard, domain allowlist, and rate limit checks before any outbound call.
- Never log plaintext submitted URLs or provider API keys.
