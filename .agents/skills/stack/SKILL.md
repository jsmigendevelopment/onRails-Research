---
name: stack
description: Use to decide how an app gets built ("what stack should we use", "pick the tech", the tech grill in /idea after naming) - platform, framework, UI kit, architecture and folders, API pattern, database, auth, hosting, test and production environments, the local checks (no GitHub Actions), and the risk dial. Recommends a pick with alternatives for each area so beginners can accept and experts can override.
---

# Stack: short, opinionated, overridable

The person shouldn't need to know any of this. For each area, give your **recommended pick, why it fits this product, and one or two alternatives.** A beginner says "go with your picks." An expert changes whatever they want. Keep rounds at three questions.

**On Full automation, ask nothing.** Take every recommended pick, and the one-way doors from the review. The risk dial is Move fast unless the profile's `risk_dial` says otherwise. The time format is ISO 8601. Mark each row in `docs/stack.md` **AI pick, not reviewed**, and write `ci = "local"`. A step only the person can do (a login app for Cloudflare Access, a key) becomes a "Setup step for you" in "Waiting on you" (`ask`), and the work goes on. Production stays on the always-stop list.

## Order

The platform comes first, because everything else depends on it.

1. **Platform(s):** web, iOS, Android, desktop, CLI. Decide from the main flow and the users, not from habit.
2. **Framework and language.**
3. **UI kit and styling.** Always pick one. Without one, the AI invents its own components and the UI drifts.
4. **Architecture and folders:** a modular monolith with feature modules in a module-based folder structure (see `templates/architecture.md` in the `idea` skill). Also pick the path alias (`@/`), and a generator that makes a new module from the example one (`pnpm new:module <name>`), so agents copy the shape instead of inventing it.
5. **API pattern:** controller → service → repository/client, with one composition root. Also pick the wire style.
6. **Data:** the database, how the schema is migrated, and backups.
7. **Auth:** buy it, don't build it.
8. **Environments:** **test** and **production**, plus a **preview per pull request** if the host offers one. After each merge, the session deploys main to test with the pack's script (`pnpm deploy:test` on the web pack), never a workflow.
   - **Who can open the test site and previews?** Ask in plain words: "Should the test site need a login, so strangers and search engines can't see it?" Recommend **Cloudflare Access** (that's a login wall in front of the app, like Google IAP). Then ask how people sign in, and offer every personal-account option, recommendation first:

     | Sign in with | Good for |
     |---|---|
     | **Google** (recommended) | Almost everyone has one |
     | GitHub | Developers. Can allow a whole GitHub org. |
     | Facebook | Non-technical testers |
     | LinkedIn | Business testers |
     | Yandex | Testers in Russia and nearby |
     | An emailed one-time code | No setup at all. Always kept as the fallback. |

     They can pick more than one. Then ask who's allowed: a list of emails, a whole email domain, or a GitHub org. Each provider except the emailed code needs a login app the person creates once ("Setup step for you" in `ask`). Other choices: a password page in the app, or no protection.
   - **Anything in production behind a login?** For example `/admin`, or the whole app for an internal tool. Production changes are on the always-stop list: show the dry run, then ask.
   - **Agents get test credentials only.** Production keys and settings stay with the person.
9. **The checks, run from the session (`ci = "local"`):** the project must provide `check`, `lint`, `typecheck`, `test`, `test:e2e` and `build` (see `AGENTS.md`). Before every merge, an agent other than the builder runs them on the exact head commit in a clean worktree, plus a secret scan and the agent-file guard, and posts the `onrails/check` commit status (`coordinate`). Previews and deploys are scripts the session runs too. Write `ci = "local"` in `docs/stack.md` for every repo, private or public: no GitHub Actions. `ci = "actions"` only if the person turns it on themselves; never recommend it. Never add a workflow, enable one or depend on one. A tool's docs say "add this workflow"? Run its commands from the session as a package script instead. Lint enforces the code rules a tool can check: no `any` or unexplained `eslint-disable`, no `console.log`, file and function size, unused exports, import order and kebab-case names.
10. **Build vs buy** for every other need: open source first, then a free-tier SaaS, then build it.
11. **App conventions,** as quick confirmations. Say the default and move on unless the person objects. The reasons are in `guide/app-conventions.md` in the kit.
    - State: local `useState` first, then typed search params for anything shareable, then **Zustand** only for complex shared client state. Server data in TanStack Query, forms in **TanStack Form**, tables in **TanStack Table**. The other TanStack defaults (charts, Markdown, highlighting, long lists, shortcuts) are in the table below: confirm them as defaults, install none until a feature needs it.
    - Drizzle, snake_case plural tables, `created_at` and `updated_at`, an index on every foreign key. The ID: **UUIDv7 or ULID**, made on the server. Ask which.
    - Money: one `Money` type in integer minor units plus the currency. Rounding: half-even for splitting and tax, unless they want another rule.
    - Time: instants in UTC. Ask the format: **ISO 8601 or epoch milliseconds**, one for the project. Temporal where supported, else `date-fns` with `@date-fns/tz` (until research confirms).
    - A public API under `/api/v1`, if anything outside the web app will call it, with OpenAPI built from the Zod schemas by the build.
    - The error system with request IDs, `ErrorState` and `EmptyState`, the one logger (logs to Workers Logs and Logpush, until research confirms), a health endpoint, an audit table, feature flags, the event registry and `track()`.
    - Env: local, test, preview and production, one typed env schema, every variable in `.env.example` (`guide/environments.md` in the kit).
    - Breakpoints and a type scale in the design tokens.
    - Every change tied to an issue, checked before merge (the pack's `pr:rules`).
    - **Ask these two outright:**
      - *"Support many languages from day one, or English only for now?"* Recommend English only unless the users need more. Yes: `i18next` with `react-i18next` (until research confirms), keys per module. No: text per module in `copy.ts`.
      - *"Will people share things, have teams, or have roles?"* No: owner-only checks in the repository. Yes: relationship-based access (tuples behind one `check(user, action, object)` port), with the kit's built-in engine by default (until research confirms). Write the answer in `docs/security-policy.md`.
12. **Repo, risk dial and automation level:** confirm visibility and licence, pick the risk dial, and copy in the automation level asked at the start (the `automation` skill). Explain both in one sentence each: the risk dial is how careful each merge is; the automation level is how much agents do without the person. Below Full, when they disagree, the more careful one wins. On Full, a careful dial adds reviews, never a person (#103).

## Default picks for a web app

| Area | Recommended | Alternatives |
|---|---|---|
| Framework | TanStack Start (React, TypeScript) | Next.js, React Router (framework mode), SvelteKit |
| UI | shadcn/ui + Tailwind CSS | Mantine, Radix + your own CSS |
| Structure | Module-based feature folders (`src/modules/<feature>/`) | By layer (only for tiny apps) |
| Code layers | Route or controller → service → repository or client, inside each feature module | |
| Server calls from the web app | Typed server functions (`createServerFn`), inputs checked with Zod | tRPC, oRPC |
| HTTP API for other clients | Versioned `/api/v1` JSON, Clerk bearer tokens, Zod at the edge | GraphQL |
| Boundary check | `eslint-plugin-boundaries` or `dependency-cruiser`, run with lint | A custom script |
| Code-rule lint | `typescript-eslint` strict, `max-lines` (warn 300, error 500), `knip` for unused code | Biome |
| Module generator | `pnpm new:module <name>`, a small script that copies the example module | Plop, Hygen |
| Database | SQLite (self-hosted, or Cloudflare D1) | Supabase Postgres when SQLite isn't enough (add-on `database-supabase`; decide before launch); Convex for heavy real-time multi-user |
| Queries | Drizzle | Kysely, Prisma |
| Server data | TanStack Query | |
| Client state | Local first, then the URL, then Zustand | Jotai |
| Forms | TanStack Form (recipe `form.md`) | React Hook Form |
| Data grids | TanStack Table v9 (recipe `table.md`) | |
| Charts | TanStack Charts (recipe `charts.md`) | Recharts |
| Markdown content | TanStack Markdown (recipe `markdown.md`) | `react-markdown` |
| Code highlighting | TanStack Highlight (recipe `highlight.md`) | Shiki |
| Long lists | TanStack Virtual (recipe `virtual.md`) | |
| Keyboard shortcuts | TanStack Hotkeys, 0.x: pin it exactly (recipe `hotkeys.md`) | |
| IDs | UUIDv7, made on the server | ULID |
| Dates and times | Temporal where supported, else `date-fns` + `@date-fns/tz` (until research confirms) | Luxon |
| Money | One `Money` type in `lib/money.ts`, integer minor units | Dinero.js (until research confirms) |
| Translation | Off. Strings kept per module in `copy.ts` | `i18next` + `react-i18next` if asked (until research confirms); Paraglide |
| Access control | Owner-only; ReBAC behind `check()` with the built-in tuples engine when sharing or teams are needed (until research confirms) | SpiceDB or OpenFGA, injected through the same port |
| Logs | One logger, JSON lines, to Workers Logs and Logpush (until research confirms) | |
| OpenAPI | Built from the Zod schemas with `zod-openapi` by the build (until research confirms) | `@asteasolutions/zod-to-openapi` |
| Auth | Clerk (free tier) | Supabase Auth, Better Auth (self-hosted) |
| Domain | Buy it on Cloudflare (at-cost pricing, DNS included). No domain yet? Workers gives a free `<app>.<account>.workers.dev` address. | Your existing registrar, with DNS moved to Cloudflare |
| Hosting | Cloudflare Workers | Netlify |
| File storage | Cloudflare R2 (no egress fees). Add-on `r2-uploads`, risky lane | Presigned URLs past about 90 MB |
| Cache and key-value | Cloudflare KV | |
| Background jobs and schedules | Cloudflare Queues and Cron Triggers. Add-on `jobs` | `waitUntil` or Workflows for small cases |
| Bot and spam protection | Cloudflare Turnstile | |
| Analytics | Cloudflare Web Analytics (no cookie banner). Add-on `analytics`, tiny lane | Plausible if you need more |
| Errors | Sentry (free tier), once real users arrive. Add-on `sentry` | Workers Logs |
| Email | Resend for sending, Cloudflare Email Routing for receiving. Add-on `email-resend`, risky lane | Postmark |
| Payments | Stripe for subscriptions. Add-on `stripe`, risky lane | Lemon Squeezy or Paddle as merchant of record |
| Tests | Vitest + Playwright | Jest |

**The TanStack defaults per area** (forms, data grids, charts, Markdown, code highlighting, long lists, keyboard shortcuts) are the owner's decision of 2026-11-23 for any web app, on any framework. They are defaults *when the app needs that area*, not installs: nothing is added until a feature needs it, and the issue that adds it names its recipe (`stack-tanstack-start/references/tanstack/<area>.md`), which the builder loads. The grill and `/join` confirm each one as a default ("Charts, if we need them: TanStack Charts. OK?"); they don't open it as a question.

If the person picks a database, make it a real decision. Switching engines after launch means a new SQL dialect and a data migration.

**Cloudflare first:** if Cloudflare offers a need on its free tier, recommend it. One account, one bill, one dashboard.

For other platforms there's no fixed default. Recommend the mainstream choice, since a niche stack takes more correction rounds with an AI. Anything crucial and unclear goes to `research`.

## Stack packs

**Add-ons:** a pack can have add-ons (for the web pack, `stacks/tanstack-start-addons/`). Offer one only when the app needs it, then apply it with `npx onrails add tanstack-start/<add-on>` and finish the steps in its `ADDON.md`.

A stack pack is a ready-made starter for one stack: configs, the folder skeleton, an example module, the check contract, and the checks, previews and deploys as scripts the session runs, already working. Packs ship no GitHub Actions workflows. Look for a skill named `stack-<name>` (for example `stack-tanstack-start`).

- **A pack exists for the pick:** say so, and slice 0 applies it (see `pyramid`).
- **A stub pack** (`stacks/<name>/PACK.md`, no app files yet): the groundwork is done but the starter isn't built. Tell the person, then build it in their project by following `PACK.md` step by step: the pinned versions, the folder structure, how each check-contract command maps, the checks and release. Never add the GitHub Actions workflow a `PACK.md` asks for: make that job a package script the session runs instead. Re-check the versions first, because they age. Slice 0 isn't done until every check-contract command passes. Afterwards, offer to contribute the finished starter back to the kit.
- **No pack:** slice 0 sets up the same things by hand, following the check contract and `architecture.md`. Afterwards, offer to save the result as a new pack.

Research behind the packs: `research/platform-packs.md` in the kit.

## Write it down

From the `idea` skill's `templates/`:
- `docs/stack.md`: every row marked **default** or **chosen** (on Full, **AI pick, not reviewed**), and `ci = "local"`;
- `docs/architecture.md`;
- `docs/security-policy.md`: the trust boundaries, what's sensitive, and the risks the person accepts and why. The security reviewer reads it.

Add each decision to `docs/decisions.md`.
