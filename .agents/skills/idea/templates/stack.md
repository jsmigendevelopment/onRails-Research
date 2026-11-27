# Stack

Picked in the tech grill. Every choice says whether it was the recommended default or the person's own call.

| Area | Choice | Alternatives considered | Default or chosen | Why |
|---|---|---|---|---|
| Platform(s) |  |  |  |  |
| Framework |  |  |  |  |
| UI kit and styling |  |  |  |  |
| API style |  |  |  |  |
| Database |  |  |  |  |
| Auth |  |  |  |  |
| Hosting and deploy |  |  |  |  |
| Environments (test, prod) |  |  |  |  |
| Test site and preview login | Cloudflare Access with Google / GitHub / Facebook / LinkedIn / Yandex / emailed code; password page; none |  |  |  |
| Who's allowed in | emails / an email domain / a GitHub org |  |  |  |
| Production behind a login | nothing / chosen paths (`/admin`) / the whole app |  |  |  |
| Testing |  |  |  |  |
| Client state | local first, then the URL, then Zustand |  |  |  |
| Server data | TanStack Query |  |  |  |
| Forms (when needed) | TanStack Form |  |  |  |
| Data grids (when needed) | TanStack Table v9 |  |  |  |
| Charts (when needed) | TanStack Charts |  |  |  |
| Markdown content (when needed) | TanStack Markdown |  |  |  |
| Code highlighting (when needed) | TanStack Highlight |  |  |  |
| Long lists (when needed) | TanStack Virtual |  |  |  |
| Keyboard shortcuts (when needed) | TanStack Hotkeys (0.x: exact pin) |  |  |  |
| ORM | Drizzle |  |  |  |
| ID strategy | UUIDv7 / ULID, made on the server |  |  |  |
| Instant format | ISO 8601 UTC / epoch milliseconds |  |  |  |
| Date and time library | Temporal, else date-fns + @date-fns/tz (until research confirms) |  |  |  |
| Money columns | `*_cents` / `amount_minor`, plus `currency` |  |  |  |
| Rounding | half-even for splitting and tax |  |  |  |
| Languages | English only (`copy.ts`) / many (i18next, until research confirms) |  |  |  |
| Access control | owner only / ReBAC behind `check()` (built-in engine, until research confirms) |  |  |  |
| Logs | Workers Logs + Logpush (until research confirms) |  |  |  |
| Analytics |  |  |  |  |
| OpenAPI generator | zod-openapi (until research confirms) |  |  |  |
| Other SaaS / libraries |  |  |  |  |

The "when needed" rows are defaults, not installs: a library is added by the first issue that needs it, and that issue names its recipe (`stack-tanstack-start/references/tanstack/<area>.md` in the kit).

## Build vs buy

For each need: open source first, then a free-tier SaaS, then build it.

| Need | Open source? | Free-tier SaaS? | Decision |
|---|---|---|---|
|  |  |  |  |

## Repo

- Visibility: private / public
- Licence: none / MIT / other

## Risk dial

How carefully changes are gated. Pick one.

- [ ] **Move fast:** startup or side project, no real users yet. Agents merge after automated review, and the person reviews by using the app.
- [ ] **Careful:** real users or real money. Below Full, the person reads every schema and migration change and skims every API change before merge. On Full, those changes get an extra agent review instead (#103).
- [ ] **Strict:** bank, health, or anything regulated. Below Full, the person approves every merge, and there's a second human reviewer for security. On Full, a fresh `pr-review` and `pr-security` stand in, never a person (#103).

Whatever the dial, the **always-stop list** in `AGENTS.md` still applies: production, secrets, real data and money always wait for the person.

## Automation level

How much agents do without the person (the `automation` skill). The risk dial above is how careful each merge is. Below Full, when they disagree, the more careful one wins. On Full, a careful dial adds reviews, never a person (#103). Change it any time with `/automation`.

- **Level:** recommended  <!-- recommended | full | hands-on | custom -->
- **Loop:** on  <!-- on | off -->
- **Merges, tiny lane:** agents  <!-- agents | person -->
- **Merges, normal lane:** agents
- **Merges, risky lane:** person
- **Opens pull requests:** agents
- **In flight at once:** 3  <!-- issues claimed and not yet merged, below Full counting claimed work waiting on the person (on Full it doesn't count); 1 on Hands-on; the loop finishes one before it starts another -->
- **Overnight loop:** off  <!-- on | off; /afk offers it when off -->
- **Ping level:** decisions  <!-- decisions | blockers | critical; read by notify.mjs -->

## Checks and deploys

ci = "local"

`local` (the default, and the only recommendation): every check, preview and deploy runs from the agent's session, never from GitHub Actions. Before each merge, an agent other than the builder runs the checks on the exact head commit and posts the `onrails/check` commit status. `actions` only if the person turns it on themselves.

## Logs

- Where they go: 
- How long they're kept: 

## Environments

The rules: `guide/environments.md` in the kit. Local, test, preview and production. Every variable is in `.env.example` and `lib/env.ts`.

- Test URL: 
- Preview per pull request: yes / no
- Production URL (`SITE_URL`): 
- Production: deployed only after the person's yes, from the session (the web pack: `pnpm deploy:production --confirm "deploy production"`). Production keys live on the production host (`wrangler secret put --env production`), never in the repo.
