# Recipe: TanStack Start

Load with an issue whose `Recipes:` line says `start`: a new route, server function or rendering change in a TanStack Start app. The pack (`stacks/tanstack-start/`) already follows it; this is the checklist for new work.

## The official prompt

> Build a TanStack Start application with file-based TanStack Router routes, validated search params, route loaders, typed server functions, full-document SSR, and streaming. Keep server-only work behind explicit boundaries, choose the appropriate SSR mode per route, and target the deployment runtime without changing the application model.

Source: tanstack.com/start, "Copy Start prompt" (`TanStack/tanstack.com` `src/components/landing/StartLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/react-start` **1.169.7** on npm, checked 2026-11-23 (MIT; peers React 18 or 19 and Vite 8). Its plugin bundles `@tanstack/start-plugin-core` 1.172.0. Pinned exactly in the pack.

## API check

Read in `TanStack/router` at `ce46b21` (2026-11-19) and in the installed 1.169.7. Everything the prompt names exists: file routes (`createFileRoute`), `validateSearch`, `loader`, `createServerFn` with `.validator()` and `.handler()`, `createServerOnlyFn`, `createMiddleware`, streaming through React Suspense, and the route `ssr` option (`true`, `'data-only'`, `false` or a function; `defaultSsr` in `createStart`). The deploy target is a Vite plugin (`@cloudflare/vite-plugin` here, or Netlify's).

## The kit's rules on top

- **Routes are thin:** validate params and search, prefetch with `queryClient.query()` or `queryClient.infiniteQuery()`, render a module view. No fetching in views.
- **Server functions** go through the pass-through validator and the controller (`respond()`), never `.validator(zodSchema)` directly (gotcha 4 in the stack skill), and return the `ApiResult` envelope.
- **Server-only boundaries:** bindings and secrets only inside `.server()`, `.handler()` or `createServerOnlyFn`; never name a server file `*.client.*`.
- **SSR mode:** full SSR by default and never written out. `'data-only'` when the component can't render on the server; `false` when the loader or component needs the browser. A comment above `ssr:` says why (`local/ssr-needs-reason`). Give a non-SSR route a `pendingComponent`: the server renders it in its place.
- **Streaming:** await what the page needs first; start the rest without awaiting and read it behind `<Suspense>` with a skeleton in the loaded shape (the "More notes" example).
- **Runtime:** Cloudflare Workers through `@cloudflare/vite-plugin`; the environment is chosen at build time (`CLOUDFLARE_ENV`). Switching hosts is the Netlify section of the stack skill, not a rewrite.

## Done when

- [ ] Every new route has `head()` with `pageHead()` (noindex for app pages) and appears in `ROUTES` in `e2e/helpers.ts`, so axe and the screenshots cover it.
- [ ] Search params and path params are validated by the route (see `router.md`).
- [ ] Server functions call one controller method and return the envelope; bad input comes back as `validation` with field messages (a controller test proves it).
- [ ] No server-only import reaches the client build (`pnpm build` passes; nothing from `cloudflare:workers` in `dist/client`).
- [ ] Any `ssr` other than the default has its reason, and the page still works with JavaScript off where it can.
- [ ] A slow secondary part streams behind `<Suspense>` with a shaped skeleton, and the first part renders without it.
- [ ] `pnpm check`, `pnpm check:budgets`, `pnpm test:e2e` and `pnpm test:visual` pass.
