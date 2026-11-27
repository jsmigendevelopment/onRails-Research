# App conventions

How the owner builds apps. These hold from day one, in every app the kit starts.

[code-style.md](code-style.md) covers how code reads. This page covers how an app is put together: UI reuse, state, issues, imports, errors, loading, empty and error screens, UI layers, the API, money, time, the database, logs, analytics, OpenAPI, environment variables, translations, access control and the things that hurt to add later. The `build` skill follows it, the `pr-review` skill checks it, and a stack pack turns as much as it can into generators, lint and the checks the local gate runs before each merge.

The examples name the default web stack (TanStack Start, TanStack Query, TanStack Router, Drizzle, Cloudflare). Another stack keeps the rule and swaps the library. Where a pick says "(until research confirms)", it's the mainstream choice and a `research` dossier may change it.

Joining a repo that already does some of this its own way? The `join` skill lists each clash and the person picks. Never switch a repo to these conventions silently.

## 1. Rule of three for UI

Build it once. Build it twice. The third time, extract a reusable component or layout. Before you build it even once, search `components/` and the module's `ui/components/` for one that already exists.

**Why:** one copy is fine and two copies are cheap. By the third you can see what they really share, so the shared component fits. Extracting at one or two guesses at the shape, and usually guesses wrong.

## 2. State lives in one right place

**Local state is the default.** `useState` and `useReducer` are completely fine, and the first choice, for state one component (or its direct children) uses. Move it only when it has a reason to leave.

| The state | Lives in |
|---|---|
| State one component and its children use: an open menu, a hover, a draft value | **Local** (`useState` or `useReducer`). The default. |
| Anything worth sharing or keeping on refresh: filters, sort, tabs, a search, the selected item, the page, a dialog worth linking to | **The URL,** through the router's typed, validated search params (a Zod schema on the route). |
| Complex client-only state that several distant components share | **Zustand,** and only then. Most apps need one or two stores, or none. |
| Data from the server | TanStack Query. Never copied into local state or a store. |
| Form state | TanStack Form. |
| A table's sorting, filtering, paging and columns | TanStack Table. Its sort, filter and page go in the URL. |

No prop drilling past two levels. If a value goes through more than two components that don't use it, lift it to the URL or a store.

**Why:** local state is the easiest to read and to delete, so it's where state starts. State copied into two places goes out of sync, and the bug shows up as stale data on one screen. Server data copied into a store is the most common case. State the user expects to keep, like a filter, is lost on refresh unless it's in the URL. A store is the hardest of these to trace, so it comes last. Deep prop chains make every middle component change when one value changes.

## 3. Everything is tied to an issue

- One issue, one branch, one pull request.
- The branch is `feat/<n>-short-name` or `fix/<n>-short-name`, where `<n>` is the issue number.
- The pull request body says `Closes #<n>`. The merge closes the issue.
- The only exception is the `no-issue` label. Dependabot gets it. A person can add it for a one-off chore.

**A check enforces it.** Before merge, the local gate (`coordinate` step 6.1) runs the kit's `pr-rules.mjs` from its checkout of main, on every stack: it fails a pull request when the branch name has no issue number, or the body has no `Closes #<n>`, unless it has the `no-issue` label. The web pack's `pr:rules` runs them by hand.

**Why:** the issue holds the acceptance checks and the fence. A pull request without one has nothing to review against, and work without an issue is work nobody asked for. The link also lets anyone go from a line of code to the reason it exists.

## 4. No barrel files

No `index.ts` that re-exports a folder. Import from the file itself: `@/modules/notes/ui/views/notes-view`, not `@/modules/notes`. The only exception is a folder that is a published library with its own `package.json`.

Module boundaries are enforced by the boundary lint (`eslint-plugin-boundaries` or `dependency-cruiser`), not by an index file. Lint fails when one feature module imports another, or shared code imports a module.

**Why:** a barrel pulls the whole folder into any file that imports one thing from it, which bloats the bundle and creates import cycles. It also hides where code lives, so agents and people jump through an extra file to find it. A lint rule draws the boundary more strictly than an index file ever could.

## 5. One error system from day one

- **Typed errors with a code from one list.** One `AppError(code, message)` type. The codes live in one file (`not_found`, `validation_failed`, `rate_limited`, ...). Add a code there, never a one-off string.
- **Expected errors get a specific message.** Every error you could predict maps to a plain message that says what happened and what to do next: "That email is already used. Sign in instead?" Never "Something went wrong" for an error you could have seen coming.
- **Unexpected errors get a short message and a reference ID:** "Something broke on our side. Reference: 7f3a9c." No stack trace, SQL or internal names reach the user.
- **One request ID, end to end.** Every request gets a trace or request ID. It appears in the logs, in the error envelope, as the UI's reference ID, and in the error monitoring (Sentry, once it's on). Paste the ID from a user's screenshot into the logs and you find the request.
- **Logged once, at the boundary,** as rule 13 says.
- **Catch at boundaries only:** the controller, the route's error boundary, the section's error boundary, a job runner. Never swallow an error. Never re-throw it as a generic one and lose the code.

**Why:** an error system added late means every old error has to be found and fixed by hand. Built in at the start, each new feature gets it for free. A reference ID turns "it broke" into one log search.

## 6. Loading, empty and error states that look finished

- Static content renders at once. Don't hide a page's heading behind a spinner.
- The route loader preloads the data, so it starts before the component renders.
- Queries run in parallel. Never wait for one to start the next unless the second truly needs the first one's result.
- Every dynamic area has its empty, loading and error states. All three, every time.

Each state is real design work, built from the shared components and the design tokens:

| State | Always has |
|---|---|
| **Error** (`ErrorState`) | an icon; a clear title; the specific message for that error code, from `error-messages.ts`; a next action (retry, go back, or contact us); the reference ID, small and easy to copy |
| **Empty** (`EmptyState`) | an illustration or icon; one sentence that says why it's empty; the primary action ("Add your first note") |
| **Loading** (a skeleton per section) | the real layout's shape and size: the same rows, columns, heights and gaps. Nothing moves when the data lands |

**A review failure:** a bare "Error", a raw `error.message` on screen, a spinner where a skeleton fits, or a plain grey box standing in for a skeleton.

**Why:** the error and empty screens are the ones people remember. A bare "Error" leaves them stuck, with no way forward and nothing to send support. An empty list with no action is the first thing a new user sees. A page that jumps as it loads feels broken and hurts Core Web Vitals (CLS). A waterfall of queries adds each wait on top of the last.

## 7. UI layers inside a module

In the style of the code-with-antonio app repos. Each module's UI has three folders: `ui/views`, `ui/sections` and `ui/components`.

| Layer | Does | Never does |
|---|---|---|
| **Route** (`src/routes/`) | preloads data (prefetches the queries), checks auth, reads and validates params, renders the view with them | layout or markup beyond the view |
| **View** (`ui/views/<feature>-view.tsx`) | the page's static layout: headings, columns, where each section goes | fetch data |
| **Section** (`ui/sections/<name>-section.tsx`) | wraps `Suspense` (with its skeleton) around an error boundary (with its error component) around the content that runs the queries | page layout |
| **Component** (`ui/components/`) | small, presentational, reusable. Takes props, renders | fetch data or read the router |

The architecture template (`templates/architecture.md` in the `idea` skill) has the folder tree and a short worked example.

**Why:** the view renders at once, because it fetches nothing. Each section loads and fails on its own, so one slow or broken query doesn't blank the page. Components with no data are easy to reuse and easy to test.

## 8. A versioned API from day one

- Public HTTP routes live under `/api/v1`.
- A breaking change adds `/api/v2` next to it. Both share the services. Only the controllers and schemas are per version.
- The old version sends `Deprecation` and `Sunset` headers. Its retirement date goes in `docs/decisions.md`.
- Contract tests run per version. OpenAPI docs are generated per version from the Zod schemas (rule 15).
- Internal server functions (the web app talking to its own server) are not versioned. They ship with the app.

A breaking change is one an old client can't survive: a removed or renamed field, a new required field, a changed type or meaning. Adding an optional field is not breaking.

**Why:** once a mobile app or a script calls your API, you can't update every caller the day you ship. A version lets old clients keep working while new ones move. Starting at `v1` costs nothing; adding a version to an unversioned API later means moving every route.

## 9. Set up early, because it's painful later

Slice 0 sets these up in the skeleton. Each one is cheap on day one and a migration later.

- **Money, time and the database:** rules 10, 11 and 12.
- **A health endpoint** (`/api/health`) that says the app is up and can reach the database. No secrets or versions of private things in it.
- **Request IDs** on every request (rule 5), and **the logger** (rule 13).
- **The event registry and `track()`** (rule 14).
- **The typed env schema** and `.env.example` (rule 16).
- **A tiny feature-flag mechanism.** A typed list of flags read from config, so a half-built feature can merge behind a flag. No paid flag service until the app needs one.
- **An audit log** for important actions: who did what, to what, when. Sign-ins, permission changes, deletes, payments.
- **Design tokens** include the responsive breakpoints and a type scale, so no screen invents its own.
- **`ErrorState`, `EmptyState` and the skeleton primitive** (rule 6).
- **User-facing text in one place per module** (rule 17).

**Why:** each of these touches every table, route or screen. Added in month three, it means rewriting what's already built and migrating real data. Added in slice 0, it's a few files.

## 10. Money

- **Integer minor units plus an ISO 4217 currency code.** $12.34 is `{ amountMinor: 1234, currency: "USD" }`. Take the number of decimals from the currency (JPY has 0, USD has 2, KWD has 3). Never assume 2.
- **One `Money` type** in `lib/money.ts`. Every amount in the app is a `Money`, never a bare number.
- **Never floats, and never JS `number` arithmetic on decimals.** No `price * 1.2`, no `0.1 + 0.2`, no `parseFloat` on a price. All arithmetic runs in minor units through the `lib/money.ts` functions. Adding two currencies is an `AppError`, never a silent sum.
- **Stated rounding rules.** Half-even (banker's rounding) for splitting and tax, unless the person decides otherwise. Write the rule in `docs/decisions.md`.
- **Allocate remainders.** Split 100 cents three ways and you get 34, 33 and 33. The parts always add up to the whole. No cent is lost or made up.
- **Format at the edge** with `Intl.NumberFormat(locale, { style: "currency", currency })`, in the UI or the email. Never store or send a formatted string.
- **The currency is stored next to every amount.** Database columns are integers named `*_cents` or `amount_minor` (one style per project), with a `currency` text column beside them. The API sends the same shape.
- **Tests** for rounding, splitting with a remainder, a zero-decimal currency, negative amounts (refunds) and mixed currencies.

**Why:** `0.1 + 0.2` is `0.30000000000000004` in JavaScript. Floats lose cents, and lost cents show up in invoices, refunds and tax reports, where they are expensive and embarrassing. An amount without its currency is a guess. Money added late means a data migration on the one table you can't afford to get wrong.

## 11. Time

- **Store instants in UTC.** One format for the whole project, picked in the tech grill: ISO 8601 with a `Z`, or epoch milliseconds. Write it in `docs/decisions.md`.
- **Three different types, never mixed:**

  | Type | Example | Stored as |
  |---|---|---|
  | Instant | when a note was created | UTC, in the project's format |
  | Calendar date | a birthday, a due date | `YYYY-MM-DD`, no time, no zone |
  | Wall-clock time plus a time zone | "9:00 every Monday in Europe/Paris" | the local time plus the IANA zone name |

  A birthday stored as midnight UTC shows the day before for anyone west of London.
- **Show times in the user's time zone** with `Intl.DateTimeFormat`, at the edge. The zone comes from the user's setting, else the browser.
- **Never parse an ambiguous string.** No `new Date("03/04/2026")`, no `Date.parse` on user text. The boundary accepts ISO 8601 with a `Z` or an offset, or a `YYYY-MM-DD` date, checked by a Zod schema.
- **A test clock.** Services get `now` injected from the composition root. No `Date.now()` or `new Date()` inside a service. Tests pass a fixed clock.
- **The Temporal API** where the runtime supports it. Otherwise a small library, `date-fns` with `@date-fns/tz` (until research confirms). All of it sits behind `lib/time.ts`, so a swap is one file.
- **Daylight saving test cases:** a day with 23 hours and one with 25, a local time that doesn't exist (2:30 on the spring-forward night), one that happens twice, and a repeating event across the change.

**Why:** time bugs hide until a user in another zone, or the one night a year the clocks change, finds them. Mixing a date with an instant is the most common cause. A fixed clock makes those cases testable.

## 12. A standard database

Drizzle is the ORM.

- **Names:** snake_case plural tables (`notes`, `team_members`), snake_case columns.
- **Primary key `id`:** a time-sortable ID, UUIDv7 or ULID (one per project, picked in the tech grill), made by the server. Never by the client, never an auto-increment number.
- **`created_at` and `updated_at`** on every table, in UTC, set by the server. Every write updates `updated_at`.
- **Foreign keys** are named `<table_singular>_id` (`note_id` points at `notes.id`). Every foreign key has an index.
- **Enums** are text with a check constraint, or a lookup table when the list changes often or carries data.
- **Booleans** start with `is_` or `has_`: `is_archived`, `has_paid`.
- **Soft delete only where `docs/decisions.md` says so,** with a `deleted_at` column. Every query on that table filters it out. Everywhere else, delete means delete.
- **An audit table** (`audit_events`) for important actions: who (`actor_user_id`), what (`action`, an `object_action` name), to what (`object_type`, `object_id`), when (`created_at`), and the `request_id`. No personal data in it.
- **Migrations go forward only.** They're generated by Drizzle Kit, reviewed (the risk dial in `docs/stack.md` says by whom), and never edited after they've run.
- **Safe to roll out:** expand, then contract. Add a nullable column, ship the code, backfill, then make it required in a later migration. Never rename or drop a column in the same deploy as the code that stops using it.
- **Money columns** follow rule 10. **Time columns** follow rule 11.

**Why:** one naming style means nobody guesses a column name. Time-sortable IDs keep inserts fast and lists in order, and don't leak a row count. A foreign key without an index turns every join into a full scan. An unsafe migration takes the app down mid-deploy.

## 13. Logging

- **One JSON line per event.** No multi-line text, no string building.
- **Levels:**

  | Level | Means | In production |
  |---|---|---|
  | `debug` | details a developer needs while chasing a bug | off |
  | `info` | a normal thing worth knowing happened: a sign-up, a job done | on, sampled if noisy |
  | `warn` | something went wrong and the app coped: a retry, a fallback, a rate limit hit. Look if it keeps happening | on |
  | `error` | a request or job failed and a person must look | on, never sampled |

- **Standard fields:**

  | Field | Holds |
  |---|---|
  | `ts` | the time, UTC |
  | `level` | `debug`, `info`, `warn` or `error` |
  | `event` | an `object_action` name: `note_created`, `payment_failed` |
  | `request_id` | the request ID (rule 5) |
  | `user_id` | an internal ID only. Never an email or a name |
  | `route` | the route or job name |
  | `duration_ms` | how long it took, when it ended something |
  | `error_code` | the `AppError` code, on warn and error |

- **Redaction by default.** The logger masks secrets, tokens, passwords, cookies, auth headers, emails and personal data before the line is written. You opt a field in, never out.
- **No log lines in loops.** Log once, after the loop, with a count.
- **Sample noisy info,** like health checks or successful reads. Never sample `warn` or `error`.
- **One logger module,** `lib/logger.ts`. Never `console.*` directly. Lint blocks it.
- **An error is logged once, at the boundary** that catches it. Code below the boundary adds context to the `AppError` and passes it on. It doesn't log.
- **Where logs go:** Cloudflare Workers Logs to search them, and Logpush to keep them longer (until research confirms). How long they're kept goes in `docs/stack.md`.

**Why:** JSON lines with the same fields can be searched and counted. Free text can't. An error logged at every layer shows up five times and hides the one that matters. A token in a log is a leaked token.

## 14. Analytics events

- **One typed registry file** (`lib/analytics-events.ts`) lists every event: its `object_action` name in past tense (`note_created`, `invite_sent`), its typed properties, an owner and the date added.

  ```ts
  export const events = {
    note_created: { owner: "notes", added: "2026-11-23", props: z.object({ note_id: z.string(), has_tags: z.boolean() }) },
  } as const
  ```

- **One `track()` function** (`lib/track.ts`). Its types only accept names and properties from the registry. Nothing else calls the analytics tool.
- **No personal data in properties:** no emails, names, free text or IP addresses. An internal ID at most.
- **Server-side events for important facts** (sign-up, payment, a plan change), so ad blockers and closed tabs don't lose them. **Client-side events for UI** (a filter used, a dialog opened).
- **The same names in logs and analytics.** `note_created` is the log `event` and the analytics event.
- **Review checks** that every new event is in the registry with an owner and a date, and that a removed event is removed there too.

**Why:** event names typed by hand drift (`signup`, `user_signed_up`, `SignUp`), and the charts split three ways. A registry with an owner tells you who to ask before you delete one.

## 15. OpenAPI for every public route

- Every public HTTP route is in the OpenAPI document: every `/api/v1` and `/api/v2` path, the health endpoint, and every webhook. Webhooks we receive are paths. Webhooks we send go in the document's `webhooks` section.
- It's built from **the same Zod schemas** the routes validate with. Never a second, hand-written copy.
- **One document per version** (`openapi.v1.json`), generated by the build and published with the docs. The generator is `zod-openapi` (until research confirms).
- **Internal server functions aren't included.** They aren't a public contract.

**Why:** a hand-written spec is wrong within a week. Built from the schemas the code runs, it can't drift, and callers, mobile apps and agents can trust it.

## 16. Environment variables

The full convention is in [environments.md](environments.md). The short version:

- Four environments: local, test, preview and production.
- Each developer has their own `.env.local`. Never shared, never committed.
- Settings that aren't secret live in committed config per environment (for example `vars` in `wrangler.jsonc`).
- Secrets live only in the host's secret store (`wrangler secret put` on the web pack). The session's deploys read their own values from the shell or a git-ignored file (`.env.cloudflare.local`) on `ci = "local"`, the default; GitHub environment secrets hold them only on `ci = "actions"`.
- One typed, validated env schema (`lib/env.ts`). A missing variable fails at startup with its name, never its value.
- Every variable is in `.env.example` with the `secrets` skill's metadata line. Adding one updates `.env.example`, the schema and the docs in the same pull request.

**Why:** a variable that only lives in one person's head breaks the next deploy and the next teammate's first day.

## 17. Translations

The tech grill asks: *"Support many languages from day one, or English only for now?"*

- **English only:** all user-facing text for a module lives in one place, `<module>/copy.ts`, never scattered through the JSX. Translation can be added later without hunting for strings.
- **Many languages:** use an i18n library, `i18next` with `react-i18next` (until research confirms). Keys are per module (`notes.empty.title`), with one message file per module per language. No string concatenation for sentences. Plurals, dates and numbers go through the library and `Intl`.

**Why:** strings in one place per module cost nothing on day one. Pulling hundreds of strings out of JSX later is slow and misses some.

## 18. Access control

- **Simple apps:** "a user owns their own rows." Every query filters by the owner, in the repository. Someone else's row returns "not found".
- **Anything more** (sharing, teams, roles, folders): relationship-based access control (ReBAC), in the style of Google Zanzibar and SpiceDB.
  - Relationships are stored as tuples: (object, relation, subject). `doc:42 editor user:7`. `doc:42 parent folder:9`. `team:3 member user:7`.
  - One `check(user, action, object)` function, behind a port (`server/authz.ts` is the interface). The adapter is injected through the composition root, like a repository. Services call `check()`. Nothing else decides access.
  - No role checks scattered in code. No `if (user.role === "admin")` in a service or a component.
  - **The default adapter is the kit's own small built-in engine:** a tuples table in the app database, plus the schema of relations (which relations grant which actions) as code in one file (until research confirms).
  - **SpiceDB, OpenFGA or another Zanzibar-style service** can be injected later in its place, without touching the services.
  - The table shape, the schema format and how lists are filtered are being designed in a research thread (`research/authorization.md` in the kit, coming). Until it lands, treat those details as "until research confirms".
- The tech grill asks: *"Will people share things, have teams, or have roles?"* The answer and the model go in `docs/security-policy.md`.

**Why:** role checks copied into every handler drift, and one missed copy is a data leak. One `check()` is one place to test and one place to fix. The port means the engine can change without a rewrite.

## What tools enforce

A stack pack turns these into generators, lint and the checks the session runs before merge, so the reviewer only judges what a tool can't:

| Rule | A tool can check or make |
|---|---|
| 3 | a check before merge (`pr:rules`): issue number in the branch name, `Closes #<n>` in the body, or the `no-issue` label |
| 4 | lint: no `index.ts` re-export files outside published packages; the boundary rules |
| 5 | lint: no `throw new Error(...)` outside `lib/`, no empty catch; a test that every error code has a message |
| 6, 7 | generators for module, route, section and component that already hold the right shape, with `ErrorState`, `EmptyState` and a skeleton |
| 8, 15 | contract tests per version; an OpenAPI build step per version |
| 10 | lint: no float or decimal column for money, no `parseFloat` near money; tests for rounding and splitting |
| 11 | lint: no `Date.now()` or `new Date()` in a service, no `Date.parse`; daylight saving tests |
| 12 | lint or a schema test: snake_case names, `id`, `created_at` and `updated_at` on every table, an index on every foreign key, `is_`/`has_` booleans |
| 13 | lint: `no-console` outside `lib/logger.ts`; a test that the logger masks secrets and emails |
| 14 | types: `track()` only takes registry names; a test that every name matches `object_action` |
| 16 | the env schema fails startup on a missing variable; a test that `.env.example` and the schema list the same names |
| 18 | lint: no `role ===` checks outside `server/authz.ts` |

Rules 1, 2, 6, 7, 17 and 18 still need judgement. `pr-review` checks every rule here, one line each.
