---
name: web-security
description: Use when protecting a web app from bots, spam, abuse or surprise bills ("stop the spam", "bots are hitting the form", "add rate limiting", "block AI crawlers", "security headers", "what if we get flooded") - cost of each request path, edge blocks, rate limits, form spam, AI crawlers, webhooks, closed input schemas, uniform 401s, one error envelope, safe logs, and deploy tokens.
---

# Web security: bound the damage, fail closed at every boundary

Make every request a stranger can send cheap to refuse, strictly checked, and unable to run up a bill.

## Rules

1. **Map what each request path costs first.** List every route a stranger can reach (pages, unknown URLs, POST routes, webhooks, preview URLs) and what it reads, writes or sends. Defend the expensive ones first.
2. **Know your plan's failure mode.** A free tier usually stops serving at its limit; a paid tier usually keeps serving and keeps billing. Set budget alerts, sample logs, and cap CPU or usage where the host allows it. Write down which risk you chose.
3. **Unknown URLs get a static 404,** never a server render. Block scanner paths (`.php`, `/wp-`, `/.env`, `/.git`) at the edge or CDN, where a block costs nothing.
4. **Close every schema at a trust boundary.** Requests, webhook payloads, config and agent output reject unknown fields, including in nested objects (`z.strictObject`, `additionalProperties: false`). Build response objects field by field so a new database column never leaks.
5. **Every boundary has written limits.** Check body size before reading it, rate-limit before parsing, put a timeout on every handler and outbound call, and cap list sizes and open streams. Keep the numbers in the shared contracts so the client knows them too.
6. **Auth failures all look the same.** Missing, wrong, expired and mismatched credentials get one 401 body. Someone else's resource is `not_found`, never `forbidden`. Scope every query by owner, and compare secrets in constant time.
7. **One error envelope for every route.** Return a stable code and a safe message. Never send stack traces, SQL, file paths or internal names.
8. **Logs hold ids and outcomes only.** No request bodies, no personal data, no secret values or auth headers. Name a missing variable, not its content.
9. **Check the shape of every POST.** The `Origin` must match the site (or be absent with `Sec-Fetch-Site` of `same-origin`), the content type must be what the form sends, and the body must be small. Bind every SQL value; never build SQL from strings.
10. **Bound a form's damage before adding checks.** Add a daily send cap, hold the overflow for a digest, and keep a kill switch you can flip without a deploy. Never e-mail an address a stranger typed (no auto-reply, no "send me a copy"). Spam scoring holds a message for review; it never silently drops it.
11. **Never trust a signal the client reports.** A minimum fill time uses a server-signed timestamp. Add a captcha such as Turnstile only when counters show the cheap layers fail, load it on first form focus, and verify the token on the server.
12. **Rate-limit by the right key.** Key on the IPv4 address or the IPv6 /64, plus one low site-wide limit. Spare verified search bots in every limit or challenge. Assume crawlers come from many home addresses, so don't rely on one IP being noisy.
13. **Decide the AI-crawler policy on purpose.** Use `robots.txt` per crawler, and check that an edge setting does not block search engines by accident. A crawler's user agent is a claim; verify by published address or the CDN's verified-bot flag.
14. **Verify webhooks headers first.** Reject a missing signature or stale timestamp before reading the body, cap the body, verify in constant time, and return a bare 401.
15. **Text a stranger typed is untrusted input to any AI that reads it.** Strip invisible characters, label it as untrusted, and keep agents that hold credentials away from it.

## On Cloudflare Workers

- Static asset requests are free; anything that runs the Worker is counted. A WAF or rate-limiting rule block is the only rejection that is not billed, so put certain rejections there and keep the rule text in the repo. (checked 2026-11)
- Setting AI "Training" to Block also blocks major search crawlers. Use Allow or Disallow and keep `robots.txt` as the policy. Leave Bot Fight Mode off on a byte-budgeted site; it injects a script into every page. (checked 2026-11)
- `*.workers.dev` and preview URLs sit outside your zone's rules and share production bindings. Give previews their own Worker and data, add `X-Robots-Tag: noindex` there, and gate side effects on the hostname.
- Send security headers from both `_headers` and the Worker: HSTS (no `preload` on a subdomain), `nosniff`, a strict `Referrer-Policy`, a tight `Permissions-Policy`, and a CSP with `object-src 'none'; base-uri 'none'; frame-ancestors 'none'`. Use a per-response nonce for pages rendered on the server, and hashes for prerendered pages.

## Accounts and deploy tokens

- A deploy token stays on the machine that deploys (the session's shell or a git-ignored file), never where pull-request code runs: the local gate runs with deploy tokens unset (`coordinate` step 6.1). Use one scoped token per job, each with an expiry.
- Every account that can change the site uses a passkey or security key. Changing a dashboard or account setting needs the person's approval of the exact change.

## Checklist before merge

- [ ] Every new input schema rejects unknown fields, nested ones too, with a test for it.
- [ ] New routes check size, rate and auth before parsing the body, and call out with a timeout.
- [ ] Auth failures return one identical 401; another user's data returns `not_found`.
- [ ] Errors use the shared envelope; no stack, SQL or path reaches the client.
- [ ] New log lines carry no body, personal data or secret value.
- [ ] Any form that sends e-mail has a daily cap and never writes to a typed-in address.
- [ ] Preview deploys cannot touch production data or send real messages.
