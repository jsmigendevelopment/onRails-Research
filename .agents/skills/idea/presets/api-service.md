# Preset: API service

**For:** a backend or AI service that other apps call.

## Preloaded (confirm, don't ask)

- **Add-ons:** Sentry, Cloudflare Queues for slow work.
- **Floor answers:**
  - API keys per client, stored hashed;
  - rate limits per key;
  - a versioned API (`/v1`);
  - OpenAPI docs;
  - one error format;
  - no personal data in logs.
- **Common slices:** issue a key, the core endpoint, usage limits, a health check and status.
- **Skip:** UI slices, unless there's a small admin page.

## Still ask

- Who calls it, and how many calls a day.
- Whether it calls an AI model (cost per call, timeouts, retries).
- What it charges, if anything. Ask this open first.
