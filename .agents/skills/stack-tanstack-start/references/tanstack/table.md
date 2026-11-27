# Recipe: TanStack Table v9 (data grids)

Load with an issue whose `Recipes:` line says `table`: a data grid (sorting, filtering, paging, selection, column control). A plain list is not a grid: use a list.

## The official prompt

> Build a TanStack Table V9 data grid for a TypeScript app. Keep it headless. Define a stable tableFeatures object with only the feature plugins, create*RowModel slots, and function registries the product needs. Use TanStack Store-backed table state, selectors, or table.Subscribe for reactive reads, and external atoms only for slices the app must own. Render semantic table elements and synchronize state to the URL or server only where the product needs it.

Source: tanstack.com/table, "Copy Table prompt" (`TanStack/tanstack.com` `src/components/landing/TableLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/react-table` **9.3.1** on npm, checked 2026-11-23 (MIT, React 18+; `@tanstack/table-core` 9.3.1). v9 is a new major: v8 examples (`useReactTable`, `getCoreRowModel()`) don't apply.

## API check

Read in `TanStack/table` at `1cfb2e5` (2026-11-18). Present: `tableFeatures({ ... })`, `useTable(options, selector?)`, feature plugins such as `rowSortingFeature` and `rowPaginationFeature`, row-model slots `createSortedRowModel()`, `createFilteredRowModel()`, `createPaginatedRowModel()`, `createGroupedRowModel()`, `createExpandedRowModel()`, `createFacetedRowModel()`, function registries such as `sortFns` and `filterFns`, `table.Subscribe` (with `selector`, or `source={table.atoms.<slice>}`), `table.atoms`, `table.store`, the `atoms` and `state` options for external atoms or state, `table.FlexRender`, and `manualSorting` / `manualPagination` for server-side work. Every name in the prompt exists. `useLegacyTable` is the v8-compatible bridge; don't start new code on it.

## The kit's rules on top

- **The pack has no data grid yet** (2026-11-23): the notes list is a list. The first grid goes in `src/components/data-table.tsx` (the shared component `docs/architecture.md` names) with the module's columns beside the module.
- **Stable features:** `tableFeatures` at module scope, with only what the product uses. Columns at module scope, or memoized when they close over props.
- **State order:** sort, filter and page in the URL (validated search params, see `router.md`) when the grid is a page's main content; local table state otherwise. External atoms only for a slice another part of the app must own. Server-side sorting and paging (`manual*`) when the data doesn't fit in one response; the URL state is then the query key.
- **Semantic markup:** `<table>`, `<thead>`, `<th scope="col">` with `aria-sort` on sortable headers, the sort control a `<button>` inside the header, a `<caption>` (visually hidden if needed). Row selection uses real checkboxes with labels.
- **States:** a skeleton of the grid's shape (header row and a few rows), `EmptyState` inside the table body for no rows and for no matches ("No notes match …", with a clear-filters action), `ErrorState` for a failed load, and the Query recipe's background states.
- **Long grids** add row virtualization (`virtual.md`), keeping the `<table>` semantics.

## Done when

- [ ] The features object holds only what the grid uses, and the bundle cost is in the pull request (`pnpm check:budgets`).
- [ ] Sorting, filtering and paging survive a refresh when they are in the URL (an e2e test).
- [ ] Headers expose `aria-sort`; the grid is keyboard-usable and axe clean in both themes.
- [ ] Loading, empty, no-match and error states are designed and tested.
- [ ] Reactive reads use selectors or `table.Subscribe`, not whole-state reads in the parent.
