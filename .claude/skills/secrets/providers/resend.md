# Resend (email-resend add-on)

Last checked: 2026-11-23. Official docs:
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/api-keys/introduction

How: resend.com was blocked here, and no public Resend docs repo was found (`resend/resend-docs` and `resend/docs` don't exist or aren't public). **Every dashboard step below is `[U]`: written generically from the add-on's notes, not checked against Resend's current screens.** Check the two URLs above before you follow it.

**What it's for.** Sending email. Fills:

```text
RESEND_API_KEY   re_...  (secret)
EMAIL_FROM       a sender on your verified domain, e.g. Acme <hello@mail.example.com>
```

Use a separate API key for test and production. `[V]` (the add-on's rule)

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Resend",
  "order": 40,
  "url": "https://resend.com/api-keys",
  "steps": "## Walkthrough",
  "vars": {
    "RESEND_API_KEY": {"secret": true, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"], "shape": {"prefix": ["re_"]}},
    "EMAIL_FROM": {"secret": false, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"]}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Resend's docs on 2026-11-26. A key is shown once.

| Variable | Open | Pick |
|---|---|---|
| `RESEND_API_KEY` | https://resend.com/api-keys | **Create API Key**. Name: `<app> test` (production gets its own key, `<app> production`, after the person's go-ahead). Permission: **Sending access**. Domain: the verified sending domain. Stop there: the person presses **Add**. `[V]` steps, `[U]` the button name. |
| `EMAIL_FROM` | https://resend.com/domains | Nothing to make: a sender on a domain marked verified here, such as `Acme <hello@mail.example.com>`. No verified domain yet? Walkthrough steps 1 and 2 add one (DNS records). Not secret. `[V]` |

## Walkthrough · about 10 minutes, plus DNS time

1. Make an account and open the domains page: https://resend.com/domains. Add a domain you own. A subdomain like `mail.example.com` keeps your main domain's reputation safe. `[U]`
2. Add the DNS records Resend shows (SPF and DKIM) at your DNS host. On Cloudflare DNS: **your domain → DNS → Records → Add record**, one per row. Wait until Resend says the domain is verified. `[U]`
3. Open https://resend.com/api-keys and create a key with **sending access** only, limited to that domain if offered. It's shown once. `[U]`
4. Paste it into `.env.test.local` as `RESEND_API_KEY`, and `EMAIL_FROM` next to it. Make a second key for `.env.production.local`. Never into chat.
5. The agent pushes them, names only: `node .agents/skills/secrets/scripts/push-secrets.mjs --dry-run --wrangler`.

When it worked: send a test email from the app; it shows in Resend's **Emails** log. Sending twice with the same idempotency key sends one email. `[V]` (the add-on's notes)

## Free tier

Resend has a free plan with a daily and monthly sending limit. `[U]`, see https://resend.com/pricing.

## Why / if it goes wrong

- **403 from Resend:** the request had no `User-Agent`; the add-on sends one. Or the key lacks sending access. `[V]` for the first (the add-on's notes).
- **"Domain not verified":** DNS hasn't spread yet, or a record was pasted into the wrong field. Copy each value exactly.
- **`EMAIL_FROM` on another domain:** Resend refuses it. It must be on the verified domain.
- **Agent tools** (Resend's docs and account MCP servers): [`../setup/resend.md`](../setup/resend.md).
