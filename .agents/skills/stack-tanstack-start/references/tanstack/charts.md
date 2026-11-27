# Recipe: TanStack Charts

Load with an issue whose `Recipes:` line says `charts`: any chart. Read the `dataviz` guidance for chart form and colour too, if it is available.

## The official prompt

> Using TanStack Charts and the accounts array in this project, plot monthlyRevenue on x and retention on y. Size each point by seats with an explicit square-root radius scale, color it by segment, and preserve the original Account rows for typed tooltip and focus callbacks. Use the compact linear scale from @tanstack/charts/scales/linear so TanStack Charts can infer the domains, add the tooltip behavior from @tanstack/charts/tooltip, and render it through the React adapter with a useful ariaLabel.

Source: tanstack.com/charts, "Copy Charts prompt" (`TanStack/tanstack.com` `src/components/landing/ChartsLanding.tsx`, commit `bc3e24a`), read 2026-11-23. It is an example about a made-up `accounts` array; the parts that carry over are below.

## Version

`@tanstack/charts` **1.5.0** on npm, checked 2026-11-23 (MIT; adapters are subpaths, each framework an optional peer). `@tanstack/react-charts` 1.5.0 is also published, as a separate wrapper over the same core; the docs use `@tanstack/charts` with its `/react` subpath, so install `@tanstack/charts` only.

## API check

Read in `TanStack/charts` at `b236dae` (2026-11-07, package version 1.5.0). Present: `defineChart`, marks from the root (`dot`, `lineY`, `barY` and more), `@tanstack/charts/scales/linear` (`scaleLinear`), `@tanstack/charts/tooltip` (`tooltip`), the React adapter `Chart` from `@tanstack/charts/react` with `definition`, `ariaLabel`, `height`, `initialWidth`, `onFocusChange` (typed with the original row), and `rScale` on dot marks.

**Not in the package:** there is no square-root scale export. The docs (`concepts/scales-and-d3.md`) inject `scaleSqrt` from `d3-scale`, which is only a transitive dependency. Either add `d3-scale` to the app (checked and pinned like any package) or pass a plain function, `rScale: (seats) => Math.sqrt(seats) * k`. The docs on `main` warn they can run ahead of the release; for 1.5.0 read the `v1.5.0` tag's docs.

## The kit's rules on top

- **Colours from tokens:** read the chart palette from CSS variables in `src/styles.css` (add chart tokens there with the person's yes; a new token is their call). No hex in components: lint refuses raw colours.
- **Accessible:** a specific `ariaLabel` ("Monthly revenue against retention, sized by seats"), keyboard focus through the built-in focus behaviour, and the numbers available as text too (a table or a summary beside the chart). Colour is never the only channel: a legend and labels or shapes.
- **SSR:** the React adapter renders SVG on the server; give `initialWidth` and `height` so the server markup has the real size (no layout shift). Use `ssr: 'data-only'` only if a chart truly can't render on the server.
- **Definitions** at module scope, or `useMemo` when they capture props.
- **States:** a skeleton of the chart's box (same height), `EmptyState` for no data, `ErrorState` for a failed load.
- **Cost:** import only the subpaths used; lazy-load a chart below the fold. Record the chunk size in the pull request.

## Done when

- [ ] The chart has a specific `ariaLabel`, a text alternative for its numbers, and works by keyboard.
- [ ] Colours come from tokens and pass contrast in both themes (axe, and the screenshot baselines).
- [ ] The server render has the final size: no layout shift on hydration.
- [ ] Empty, loading and error states are designed and tested.
- [ ] Tooltip and focus callbacks are typed with the app's own row type.
