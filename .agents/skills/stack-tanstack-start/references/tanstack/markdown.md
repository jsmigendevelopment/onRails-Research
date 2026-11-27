# Recipe: TanStack Markdown

Load with an issue whose `Recipes:` line says `markdown`: rendering Markdown (docs, posts, help text, AI answers).

## The official prompt

> Build a technical content renderer with TanStack Markdown. Parse Markdown into a serializable document tree, render it with HTML, React, or Octane, and enable only the syntax extensions the product needs. For accumulated AI responses, use the optional streaming profile without carrying incremental parser state between updates. Preserve the safe defaults and deterministic output, and keep syntax highlighting as an explicit external integration.

Source: tanstack.com/markdown, "Copy Markdown prompt" (`TanStack/tanstack.com` `src/components/landing/MarkdownLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/markdown` **1.2.1** on npm, checked 2026-11-23 (MIT, zero runtime dependencies; React and Octane are optional peers).

## API check

Read in `TanStack/markdown` at `344e68e` (2026-11-19, package version 1.2.1). Present: `parseMarkdown` and `renderHtml` (root and `@tanstack/markdown/html`), `Markdown` from `@tanstack/markdown/react`, the Octane adapter at `/octane`, opt-in extensions at `/extensions/*` (`autolinks`, `callouts`, `headings`, `tabs`, `docs`, `framework`, `comment-components`, `streaming`), `streamingMarkdownExtension()` for accumulated AI text, and a `CodeHighlighter` callback for syntax highlighting (TanStack Highlight's `createTanStackMarkdownHighlighter`). Every name in the prompt exists. It is deliberately not full CommonMark, GFM or MDX: check the syntax profile (`docs/core-concepts/syntax-profile.md`) against the content before choosing it.

## The kit's rules on top

- **Safe by default, and kept so:** raw HTML is escaped and executable URLs are refused. Never set `allowHtml: true` for content a user or a model wrote; if trusted content truly needs it, it is a security-review change (the risky lane).
- **Only the extensions used**, imported from their subpaths, so the bundle stays small.
- **Render on the server** where the content is known (posts, docs): parse once in the loader or at build time and pass the serializable tree or HTML; the page then has real content for search engines.
- **AI answers:** render the accumulated text with the streaming extension on each update; keep no parser state between updates.
- **Styling:** prose styles with tokens (headings, lists, code, tables) in one place; no per-page overrides. Links get visible focus; headings keep the page's heading order (start below the page's `h1`).
- **Highlighting** is a separate recipe (`highlight.md`), passed in through the highlighter callback.

## Done when

- [ ] A test renders hostile input (`<script>`, `javascript:` links, raw HTML) and shows it escaped or refused.
- [ ] Only the extensions the content uses are imported (check the chunk in `pnpm check:budgets`).
- [ ] Rendered content is axe clean in both themes, with a correct heading order.
- [ ] Server-known content is in the server HTML.
