# Architecture

Every agent follows this. If the code needs to break a rule here, below Full, stop and ask first. On Full, break it only with a comment that gives the reason and an issue number, record it as "AI pick, not reviewed" and put it in the FYI.

## Shape

- **Modular monolith.** One app built from feature modules. Any module could later be lifted out into its own service without a rewrite.
- **Modules never import each other.** Routes and the app layer wire them together.
- A module may import shared code (`components/`, `hooks/`, `lib/`, `db/`). Shared code never imports a module.
- **No barrel files.** No `index.ts` that re-exports a folder. Import from the file itself: `@/modules/notes/ui/views/notes-view`. Only a published library (its own `package.json`) gets one.
- **The boundary lint enforces all of this,** not an index file. `eslint-plugin-boundaries` (or `dependency-cruiser`) runs with `lint` and fails when one module imports another, or when shared code imports a module.

The owner's app conventions (state, errors, loading, the API, money, time, the database, logs, events, env, access, issue links) are in `guide/app-conventions.md` in the kit. This file is the shape they take here.

## Conventions this repo keeps

Filled in by `join` for a repo that already had its own ways. One row per clash the person decided. Where a row says "theirs" or "merge", it beats the rest of this file. Each row also has an entry in `docs/decisions.md`.

| Area | Theirs | Kit's | Decision (keep theirs, adopt ours, merge) | Notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Folder structure

Module-based, in the style of the code-with-antonio app repos. A feature's UI, hooks, server code and schemas live together in one folder.

> **This layout is for a single full-stack web app** (TanStack Start, React Router, Next.js-style apps, and similar). It doesn't fit a monorepo, a native iOS, Android or Windows app, a game engine project like Unity, or a CLI. For those, the `stack` step picks that platform's usual layout. The rules above still apply: features stay decoupled, and shared code never imports a feature.

```
src/
  routes/                  file-based routes. Thin: validate params, check auth, prefetch queries, render a view
    api/
      health.ts            GET /api/health: the app is up and the database answers
      v1/                  the public HTTP API. A breaking change adds v2/ next to it
  modules/
    <feature>/
      ui/
        views/             one per page: <feature>-view.tsx. Static layout only. Places sections. No fetching
        sections/          <name>-section.tsx: Suspense > error boundary > the content that runs the queries
        components/        small, presentational, reusable. Props in, markup out. Skeletons and error states too
      hooks/               use-<feature>-*.ts: query options, mutations
      stores/              <name>-store.ts: Zustand, client-only state shared inside this module (rare)
      server/
        <feature>.functions.ts         the route table: one short entry per server function, calling the controller
        <feature>.controller.ts        validate input, call one service method, map the result
        <feature>.http.v1.ts           the /api/v1 controller. A breaking change adds <feature>.http.v2.ts
        <feature>.service.ts           business rules. No HTTP, no SQL. Shared by every version
        <feature>.repository.ts        the interface the service depends on
        <feature>.repository.drizzle.ts  the database adapter
        <feature>.repository.memory.ts   the test fake
        <feature>.table.ts             the Drizzle table
      schemas.ts           Zod schemas shared by client and server, and the route's search params
      api-schemas.v1.ts    the /api/v1 request and response schemas. OpenAPI for v1 is built from these
      copy.ts              every user-facing string in this module
      types.ts
  components/
    ui/                    shadcn/ui primitives. Generated, don't hand-edit
                           shared app components: error-state.tsx, empty-state.tsx, data-table.tsx (TanStack Table), page layouts
  hooks/                   shared hooks
  stores/                  Zustand stores shared across the app (theme, a sidebar)
  lib/
    errors.ts              AppError and the one list of error codes
    error-messages.ts      the human message and next step for every expected code
    logger.ts              the one logger: JSON lines, standard fields, levels, redaction, sampling
    request-id.ts          reads or makes the request ID for every request
    env.ts                 the typed, validated env schema. Names a missing variable, never its value
    money.ts               the Money type: integer minor units + ISO 4217 code, rounding, allocate, format
    time.ts                instants, calendar dates and zoned times; formatting with Intl.DateTimeFormat
    ids.ts                 the project's ID: UUIDv7 or ULID, made on the server
    flags.ts               the typed list of feature flags
    analytics-events.ts    the event registry: object_action names, typed props, owner, date added
    track.ts               the one track() function. Only takes names from the registry
  db/                      database client and migrations config
  server/
    composition.ts         the one place that builds repositories and clients and wires them into services
    auth.ts                resolves the signed-in user. Only *.functions.ts and *.http.*.ts import it
    authz.ts               the access port: check(user, action, object). The adapter is injected in composition.ts
    audit-log.ts           records who did what, to what, when
scripts/
  openapi.ts               builds openapi.v1.json from the api-schemas.v*.ts files. `check` runs it
```

- **Files are kebab-case.** Views end in `-view.tsx`, sections in `-section.tsx`, and each exports a PascalCase component. Hooks are `use-*.ts`. Stores are `*-store.ts`.
- **Generators** make a module, a route, a section and a component in this shape. Use them.
- Every section handles its loading, empty and error states.

## UI layers

| Layer | Does | Never does |
|---|---|---|
| Route | validate search params, check auth, prefetch the queries, pass params to the view | layout |
| View | the page's static layout. Headings and static content render at once | fetch data |
| Section | `Suspense` (its skeleton) around an error boundary (its error component) around the content that runs the queries | page layout |
| Component | small and presentational. Props in, markup out | fetch data, read the router |

- **Rule of three:** build a piece of UI once, twice, and extract a shared component or layout the third time. Search for one first.
- **Skeletons match the content's shape and size,** so nothing jumps when the data lands. Never a plain grey box.
- **Error states** use `ErrorState`: an icon, a clear title, the code's message from `lib/error-messages.ts`, a next action (retry, go back, contact) and the reference ID. Never a bare "Error" or a raw `error.message`.
- **Empty states** use `EmptyState`: an illustration or icon, one sentence and the primary action.
- **Queries run in parallel.** The route prefetches every query the page needs at once. A section waits on its own query only.

### Worked example

A notes page with a filter in the URL. Sketches, not the full files.

```tsx
// src/routes/notes.tsx: validate params, prefetch, render the view
export const Route = createFileRoute('/notes')({
  validateSearch: notesSearchSchema, // Zod: { tag?: string, page: number }
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.query(notesListQuery(deps)) // start it, don't await: the section suspends
  },
  component: () => <NotesView search={Route.useSearch()} />,
})
```

```tsx
// src/modules/notes/ui/views/notes-view.tsx: static layout, no fetching
export function NotesView({ search }: { search: NotesSearch }) {
  return (
    <main className="page">
      <h1>{copy.title}</h1>
      <NotesFilter tag={search.tag} />
      <NotesListSection search={search} />
    </main>
  )
}
```

```tsx
// src/modules/notes/ui/sections/notes-list-section.tsx: Suspense > error boundary > content
export function NotesListSection({ search }: { search: NotesSearch }) {
  return (
    <Suspense fallback={<NotesListSkeleton />}>
      <ErrorBoundary FallbackComponent={NotesListError}>
        <NotesList search={search} />
      </ErrorBoundary>
    </Suspense>
  )
}

function NotesList({ search }: { search: NotesSearch }) {
  const { data } = useSuspenseQuery(notesListQuery(search))
  if (data.items.length === 0) return <EmptyState title={copy.empty} />
  return <ul>{data.items.map((note) => <NoteItem key={note.id} note={note} />)}</ul>
}
```

```tsx
// src/modules/notes/ui/components/note-item.tsx: presentational
export function NoteItem({ note }: { note: NoteDto }) {
  return (
    <li className="note-item">
      <span>{note.title}</span>
      <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
    </li>
  )
}
```

## State

| The state | Lives in |
|---|---|
| State one component and its children use | Local: `useState` or `useReducer`. The default |
| Filters, sort, tabs, a search, the selected item, the page, a dialog worth linking to | The URL, through the route's typed, validated search params |
| Complex client-only state shared by distant components | Zustand, and only then |
| Server data | TanStack Query. Never copied into a store |
| Forms | TanStack Form |
| Tables | TanStack Table, with its sort, filter and page in the URL |

No prop drilling past two levels: lift it to the URL or a store.

## API layers

```
request → <feature>.functions.ts → <feature>.controller.ts → <feature>.service.ts → <feature>.repository.ts → adapter
/api/v1 → src/routes/api/v1/... → <feature>.http.v1.ts → <feature>.service.ts → ...
```

| Layer | Does | Never does |
|---|---|---|
| Route table (`.functions.ts`) | declare each server function, attach auth, call the controller | anything else. Keep entries to a few lines. |
| Controller (`.controller.ts`) | parse input with the module's schema, call one service method, map errors to responses | business rules, SQL |
| Service | business rules | touch HTTP, SQL or an SDK directly |
| Repository (interface + adapter) | read and write the database | business rules |
| Client (if any) | talk to an outside API | business rules |

- **Why two files for the controller:** the route table is what the browser bundle sees, so it stays tiny. The controller is a plain function, so its tests run without a server.
- **One composition root** (`src/server/composition.ts`) builds the adapters and passes them in. That's what lets a service be tested with the memory fake.
- **Validate at every boundary,** and reject unknown fields.
- **One error envelope** for every route, with the code and the request ID. Never send stack traces, SQL or internal names to the client.
- **OpenAPI for every public route** (every version, the health endpoint, webhooks), built by `scripts/openapi.ts` in `check` from the same Zod schemas the routes use. Internal server functions aren't in it.
- **Access goes through `check(user, action, object)`** from `server/authz.ts`. Services call it. No role checks anywhere else. Simple apps filter by owner in the repository instead. The model is in `docs/security-policy.md`.
- **Someone else's data returns "not found"**, never "forbidden".
- **The public API is versioned from day one.** Routes live under `/api/v1`. A breaking change adds `/api/v2` alongside: its own `.http.v2.ts` controller and `api-schemas.v2.ts`, the same services. The old version sends `Deprecation` and `Sunset` headers, and its retirement date goes in `docs/decisions.md`. Contract tests and OpenAPI docs are per version. Internal server functions are not versioned.

## Errors and logs

- **Typed errors** with a code from the one list in `lib/errors.ts`. No one-off codes, no bare `throw new Error()` in a module.
- **Every expected code has a human message** in `lib/error-messages.ts`: what happened and what to do next. Never "Something went wrong" for an error you could have predicted.
- **Unexpected errors** show a short message and a reference ID.
- **One request ID** per request. It's in every log line, the error envelope, the UI's reference ID and the error monitoring.
- **Catch at boundaries:** the controller, the route and section error boundaries, a job runner. Never swallow an error, and never re-throw it as a generic one.
- **Logged once, at the boundary,** through `lib/logger.ts`. Never `console.*`.
- **Log lines** are JSON with `ts`, `level`, `event` (`object_action`), `request_id`, `user_id` (internal ID only), `route`, `duration_ms` and `error_code`. Secrets, tokens, emails and personal data are masked by default.
- **Levels:** `debug` (off in production), `info` (a normal thing worth knowing; sample if noisy), `warn` (went wrong, the app coped), `error` (failed, a person must look; never sampled). No log lines in loops.
- **Where logs go:** see "Logs" in `docs/stack.md`.

## Analytics

- Every event is in `lib/analytics-events.ts`, with an `object_action` name, typed properties, an owner and the date added.
- Only `track()` from `lib/track.ts` sends events. No personal data in properties.
- Important facts (sign-up, payment) are tracked on the server. UI events on the client. The same name is used in logs.

## UI

- Use shadcn/ui components. Don't hand-roll a button, dialog or form control the kit already has.
- Use the design tokens. No one-off colours, spacing or font sizes. A new token is a design decision, so ask.
- One component does one job.

## Code

- **New module, route, section or component:** run the generator (`pnpm new:module <name>` and the others in "Commands that work here"). Never free-write one it makes. For anything else, copy the nearest existing example.
- **Size:** lint warns at 300 lines a file and fails at 500. Functions stay under about 60 lines. Split by responsibility.
- **Imports:** use the `@/` alias, not deep `../../..`, and import from the file itself, never a folder's `index.ts`. Order: packages, then `@/`, then relative. Lint sorts them.
- **Errors:** throw or return `AppError` from `lib/errors.ts`. No empty catch, and never drop a caught error.
- **Docs:** each exported module API gets a one-line doc comment. Comments say why, not what.

## Data

Drizzle is the ORM.

- **Money:** one `Money` type (`lib/money.ts`): integer minor units plus an ISO 4217 code. No floats, no `number` math on decimals. Rounding is half-even for splitting and tax unless `docs/decisions.md` says otherwise; remainders are allocated. Format with `Intl.NumberFormat` at the edge. Columns: integer `*_cents` or `amount_minor` (pick one) plus `currency`.
- **Time:** instants in UTC, in the project's one format (see `docs/stack.md`). Calendar dates as `YYYY-MM-DD`. Zoned wall-clock times as the local time plus the IANA zone. Services use the injected `now`. No ambiguous parsing.
- **Tables:** snake_case plural names, snake_case columns.
- **`id`:** the project's time-sortable ID (UUIDv7 or ULID, see `docs/stack.md`), made on the server.
- **`created_at` and `updated_at`** on every table, in UTC.
- **Foreign keys** named `<table_singular>_id`, each with an index.
- **Enums** as text with a check constraint, or a lookup table. **Booleans** start with `is_` or `has_`.
- **Soft delete** (`deleted_at`) only on tables `docs/decisions.md` lists.
- **Audit table** `audit_events` for important actions (sign-ins, permission changes, deletes, payments): actor, action, object, time, request ID.
- **Migrations** only go forward, are reviewed, and never change once run. Expand, then contract: add, backfill, then require or drop in a later deploy.
- Schema changes follow the risk dial in `docs/stack.md`.

## Environment variables

Read only through `lib/env.ts`. Every variable is in `.env.example` with its metadata line. Adding one updates `.env.example`, the schema and the docs in one pull request. Secrets live in the host's secret store and GitHub environment secrets, never in the repo. The rules: `guide/environments.md` in the kit.

## Set up in slice 0

The health endpoint, request IDs, the error system, the logger, the env schema, `Money`, the time helpers and the test clock, the ID helper, feature flags (`lib/flags.ts`), the event registry and `track()`, the audit table, `ErrorState`, `EmptyState` and the skeleton primitive, the OpenAPI build, the access port (if `docs/security-policy.md` needs more than ownership), breakpoints and a type scale in the design tokens, and per-module `copy.ts`. Translation is off unless `docs/stack.md` says on; then per-module message files replace `copy.ts`.

## References

The layering takes ideas from Bulletproof React and from ports and adapters. The folder layout follows the module style above, not Bulletproof's.
