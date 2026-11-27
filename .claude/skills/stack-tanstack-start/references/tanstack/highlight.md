# Recipe: TanStack Highlight

Load with an issue whose `Recipes:` line says `highlight`: showing code with syntax colours.

## The official prompt

> Add web-first syntax highlighting with TanStack Highlight. Register only the languages the site uses, share the synchronous highlighter between SSR and the browser, and theme its stable semantic classes with CSS. Use code-fence metadata, line decorations, or exact character ranges where useful, and preserve one compact markup tree across themes.

Source: tanstack.com/highlight, "Copy Highlight prompt" (`TanStack/tanstack.com` `src/components/landing/HighlightLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/highlight` **1.2.12** on npm, checked 2026-11-23 (MIT, no peers).

## API check

Read in `TanStack/highlight` at `56630d1` (2026-11-14; npm 1.2.12 was published 2026-11-10, so re-check if the API matters). Present: `createHighlighter({ languages })` from `@tanstack/highlight/core`, languages one per subpath (`@tanstack/highlight/languages/tsx`), `createThemeCss` from `/theme` with themes from `/themes/*`, decorations (`{ lines, className }` and zero-based character ranges), fence metadata through the Markdown helpers, `createTanStackMarkdownHighlighter` at `/markdown`, and React helpers at `/react`. The output uses stable `th-*` classes (`th-code`, `th-token`, `th-keyword`, `th-line`). Every name in the prompt exists.

**Avoid the root entry** in app code: `@tanstack/highlight` builds a `defaultHighlighter` with `allLanguages`, which ships every grammar.

## The kit's rules on top

- **One highlighter module** (`lib/highlighter.ts` or the module that owns code display) with only the languages the site shows, imported by both the server render and the browser, so the markup matches and hydration is quiet.
- **Theme with tokens:** map the `th-*` classes to the app's CSS variables in `src/styles.css`, light and dark under the app's `data-theme` selector, rather than a third-party theme's colours. Check contrast of every token colour on the code background in both themes.
- **Decorations** for focus or diffs need a non-colour cue too (a marker or label), and the code block keeps a text label for its language.
- **Code blocks scroll inside themselves** (`overflow-x: auto`, focusable with a label), so the page never scrolls sideways at 320 px.

## Done when

- [ ] Only the used languages are registered (no root import), and the chunk size is in the pull request.
- [ ] Server and client markup match (no hydration warning in `e2e/security.spec.ts`'s console check).
- [ ] Token colours pass contrast in both themes (axe and the screenshot baselines).
- [ ] Long lines scroll inside the block; the page reflows at 320 px.
