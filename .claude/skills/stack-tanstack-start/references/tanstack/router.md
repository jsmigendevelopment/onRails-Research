# Recipe: TanStack Router

Load with an issue whose `Recipes:` line says `router`: routes, params, search params, links, loading and error boundaries.

## The official prompt

> Build a TanStack Router application with a generated route tree, typed params and search schemas, route loaders, intent preloading, pending and error boundaries, and automatic code splitting. Keep shareable UI state in the URL and make every link and navigation call type-safe.

Source: tanstack.com/router, "Copy Router prompt" (`TanStack/tanstack.com` `src/components/landing/RouterLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/react-router` **1.170.46** on npm, checked 2026-11-23 (MIT, React 18 or 19). Pinned exactly in the pack.

## API check

Read in `TanStack/router` at `ce46b21` (2026-11-19) and in the installed packages. Present: the generated route tree (`routeTree.gen.ts`), `params: { parse, stringify }` (returning `false` from `parse` means "no match"), `validateSearch` (a Zod 4 schema is accepted directly through Standard Schema; no adapter needed), `search.middlewares` with `stripSearchParams`, `loaderDeps`, `defaultPreload: 'intent'`, `defaultPendingComponent`, `defaultPendingMs` (default 1000), `defaultPendingMinMs` (default 500), `defaultErrorComponent`, `notFoundComponent` and `notFound()`, `<Link reloadDocument>`.

**One name that doesn't apply in Start:** `autoCodeSplitting` is a router-plugin option, but Start's config schema removes it (`start-plugin-core` 1.172.0, `schema.js`: `configSchema.omit({ autoCodeSplitting: true, ... })`) and always runs the code splitter. There is nothing to turn on. The split is `component`, `errorComponent` and `notFoundComponent`, one chunk each; `loader`, `validateSearch` and `params` stay in the entry.

## The kit's rules on top

- **The URL holds shareable state:** filters, order, tabs, the selected item, page counts. Defaults and fallbacks, so a bad link still opens; `stripSearchParams` keeps defaults out of the URL. Route-level validators ship in the entry chunk on every page, so the kit writes them as small plain functions in the module's `search.ts` (typed with `SearchSchemaInput`) rather than a Zod schema, which `validateSearch` would also accept; the server's Zod schemas still check every input.
- **Typed params:** parse with the schema; `false` for a shape that can't match (the app's 404), `throw notFound()` from the loader when a valid id finds nothing, and a designed `notFoundComponent` (icon, title, a sentence, the way back).
- **Links and navigation:** `<Link to="/notes/$noteId" params={{ noteId }}>`, `navigate({ to, params, search })`, `useSearch({ from })`, `useNavigate({ from })`. Lint refuses a raw internal `<a href="/...">`, a `to` built from a template or `+`, and `navigate('/path')`.
- **Pending and errors:** `defaultPendingComponent: PageSkeleton`, `defaultPendingMs: 300`, `defaultPendingMinMs: 500`; `defaultErrorComponent` is the designed `ErrorState`. Skeletons take the loaded shape.
- **Code splitting:** keep loaders' and validators' imports small, and prove a route's cost with `pnpm check:budgets` (`route JS` is the page's own chunks).

## Done when

- [ ] Every shareable piece of UI state is a validated search param, and a hand-edited bad value falls back instead of failing (an e2e test).
- [ ] Every dynamic segment has a params schema, and both not-found paths are tested (an e2e test for each).
- [ ] No string-built paths: `pnpm lint` passes with no exceptions.
- [ ] A slow navigation shows the page skeleton, a fast one doesn't flash it.
- [ ] `pnpm check:budgets` passes; a budget raised says why in the pull request.
