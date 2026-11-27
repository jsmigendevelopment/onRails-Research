# Recipe: TanStack Query

Load with an issue whose `Recipes:` line says `query`: reading or writing server data.

## The official prompt

> Build a TanStack Query server-state layer for a TypeScript app. Use domain-shaped query keys, colocated query functions, optimistic mutations where useful, and targeted invalidation after writes. Include loading, error, empty, background-refetch, and stale-data states. Keep server data out of global client state.

Source: tanstack.com/query, "Copy Query prompt" (`TanStack/tanstack.com` `src/components/landing/QueryLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/react-query` **5.108.3** on npm, checked 2026-11-23 (MIT, React 18 or 19). Published 2026-11-22, so the pack lists it in `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`. Pinned exactly.

## API check

Read in `TanStack/query` at `b09d8e9` (2026-11-22). Present: `queryOptions`, `infiniteQueryOptions`, `useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useMutation` with `onMutate` / `onError` / `onSettled` (the value `onMutate` returns is the third argument of `onError`), `cancelQueries`, `getQueriesData`, `setQueriesData`, `invalidateQueries`, and the result flags `isPending`, `isFetching`, `isFetchingNextPage`, `isRefetchError`, `dataUpdatedAt`. `queryClient.query()` and `queryClient.infiniteQuery()` (with `pages`) replace `fetchQuery`, `prefetchQuery`, `ensureQueryData` and their infinite forms, which are deprecated in 5.108.

## The kit's rules on top

- **Keys and options** in the module's `hooks/<module>-queries.ts`: a key factory (`all`, `lists()`, `details()`) and one options function per read, so key and fetcher can't drift. Loaders import this file, so it holds nothing else.
- **Hooks** in `use-<module>.ts`: reads and writes. Writes invalidate by prefix when they settle.
- **Optimistic only where useful:** quick edits that almost always succeed (rename, delete, toggle). Never money, permissions, or anything another person sees at once. Snapshot every cached copy, change it, return the rollback; on error roll back and show the designed error toast (`showErrorToast`: icon, title, the safe message, a reference id logged with the code, Try again and Dismiss).
- **The five states:** loading is a skeleton in the loaded shape; empty is `EmptyState` with the next action; an error with no data is `ErrorState`; a background refetch is a small "Updating…" (`RefreshStatus`), never the skeleton again; a failed refetch with data keeps the data under a "Couldn't refresh. Showing data from <time>" banner with Retry.
- **No server data in stores:** lint refuses Query, module hooks, server code and wire types in a Zustand store.
- Create the `QueryClient` inside `getRouter()` (one per request on the server).

## Done when

- [ ] Each read has one options function; components and loaders use it, never an inline key.
- [ ] Each write invalidates the narrowest prefix that is still correct.
- [ ] An optimistic write has a unit test for the change and the rollback, and an e2e test that the refused write rolls back with the toast.
- [ ] The five states each have a test (unit for the presentational parts, e2e for the flow).
- [ ] No server data in a store, a context or `useState` copies.
