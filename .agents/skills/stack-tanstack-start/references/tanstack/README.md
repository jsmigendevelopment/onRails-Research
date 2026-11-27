# TanStack recipes

One file per library. TanStack publishes a one-paragraph agent prompt for each; a recipe quotes it, records the version checked on npm, checks every API the prompt names against the package's source, and adds the kit's rules and a "Done when" list a reviewer can check.

**When to load one:** only when an issue's `Recipes:` line names it (the `issues` and `build` skills). The libraries are the kit's defaults for their areas (the `stack` skill's table, the owner's decision of 2026-11-23), installed by the first issue that needs one, never up front.

| Recipe | Area | Package, version checked 2026-11-23 |
|---|---|---|
| `start.md` | TanStack Start apps: routes, server functions, SSR | `@tanstack/react-start` 1.169.7 |
| `router.md` | routes, params, search params, links | `@tanstack/react-router` 1.170.46 |
| `query.md` | server data | `@tanstack/react-query` 5.108.3 |
| `form.md` | forms | `@tanstack/react-form` 1.33.5 |
| `table.md` | data grids | `@tanstack/react-table` 9.3.1 |
| `charts.md` | charts | `@tanstack/charts` 1.5.0 |
| `markdown.md` | rendered Markdown | `@tanstack/markdown` 1.2.1 |
| `highlight.md` | code highlighting | `@tanstack/highlight` 1.2.12 |
| `virtual.md` | long lists | `@tanstack/react-virtual` 3.14.28 |
| `hotkeys.md` | keyboard shortcuts | `@tanstack/react-hotkeys` 0.27.2 (young: pin exactly) |

**Where the prompts come from.** Each library's page on tanstack.com has a "Copy prompt" button. The text is in the site's source, `TanStack/tanstack.com`, `src/components/landing/<Library>Landing.tsx`, read at commit `bc3e24a` (2026-11-23); the owner collected the same prompts that day (issues #7 and #9). The API checks read each library's own repository at the commit named in its recipe.

**Rules for every recipe** (the kit's, on top of TanStack's):
- Install with an exact version after checking the registry again (the `dependencies` skill). A newer stable than the recipe's is fine; re-check the APIs the recipe names.
- Design tokens only: no raw colours, no arbitrary Tailwind values, shadcn/ui primitives for controls.
- Designed loading (a skeleton in the loaded shape), empty (icon or illustration, a sentence, the next action) and error states (`ErrorState`, a reference id for unexpected failures).
- Accessible: semantic elements, a name for every control, keyboard paths, visible focus, reduced motion, axe clean in both themes (`e2e/a11y.spec.ts`).
- The state order: local, then the URL (search params), then a Zustand store. Server data only in TanStack Query.
- Lint passes without exceptions. An `eslint-disable` needs a reason and an issue.
- A library a route imports for its loader, `validateSearch` or `params` ships in the entry chunk on every page: keep those imports tiny and load the library in the route's component instead. Check `pnpm check:budgets`.
