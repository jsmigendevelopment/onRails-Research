# Recipe: TanStack Virtual

Load with an issue whose `Recipes:` line says `virtual`: a list or grid long enough that rendering every row is slow (as a rule of thumb, hundreds of rows or more, or any list that grows without bound).

## The official prompt

> Build a TanStack Virtual experience for a TypeScript app. Render only visible items plus intentional overscan, measure dynamic content, support window or element scrolling, keep stable anchors for prepends and streaming content, and restore scroll position from a snapshot. Keep the scroll surface and markup owned by the product UI.

Source: tanstack.com/virtual, "Copy Virtual prompt" (`TanStack/tanstack.com` `src/components/landing/VirtualLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/react-virtual` **3.14.28** on npm, checked 2026-11-23 (MIT, React 16.8 to 19). It was published 2026-11-22: pnpm's minimum release age holds a version that new, so take the previous patch or add a dated `minimumReleaseAgeExclude` entry with the reason.

## API check

Read in `TanStack/virtual` at `ec46ffc` (2026-11-22). Present: `useVirtualizer` (element scrolling, `getScrollElement`) and `useWindowVirtualizer`, `count`, `estimateSize`, `overscan`, `measureElement` (dynamic sizes, with `data-index` on each row), `getItemKey`, `anchorTo` and `followOnAppend` (anchors for prepends and streamed appends), `takeSnapshot()` with `initialMeasurementsCache` and `initialOffset` (restore a position), `scrollToIndex`, `lanes`, `gap`. Every name in the prompt exists.

## The kit's rules on top

- **Only when needed:** a list of a few dozen rows stays a plain list. Pair with Query's infinite queries for paging (`useInfiniteQuery`, fetch the next page near the end).
- **Product-owned markup:** keep the semantic list or table; the virtualizer only positions rows. Stable keys from the data (`getItemKey`), not indexes.
- **Restore position** after navigation: save `takeSnapshot()` and the offset (session storage or router state) and pass them back; the router's `scrollRestoration` handles window scrolling for ordinary pages.
- **Accessibility:** rows that are not rendered are not in the accessibility tree, so give the list a count ("120 notes"), keep keyboard focus on a rendered row while scrolling, and never trap focus. Respect reduced motion for smooth scrolling.
- **States:** a skeleton in the row shape, `EmptyState`, `ErrorState`, and a row-shaped loader at the end while the next page loads.

## Done when

- [ ] Only visible rows plus overscan are in the DOM (an e2e test counts rendered rows on a long list).
- [ ] Rows with variable height don't jump (measured with `measureElement`).
- [ ] Going to a row's page and back restores the scroll position (an e2e test).
- [ ] Keyboard navigation reaches every row; axe is clean.
