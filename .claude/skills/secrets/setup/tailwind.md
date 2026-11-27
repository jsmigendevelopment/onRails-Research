# Tailwind CSS: setup recipe

Last checked: 2026-11-23. Rules every recipe shares: [`README.md`](README.md). No keys, so no provider file.

**The TanStack Start pack already has Tailwind v4** (`tailwindcss` and `@tailwindcss/vite` 4.3.5, the Vite plugin, `@import 'tailwindcss';` in `src/styles.css`). Use this recipe for an app not made from a pack. Tailwind publishes no agent prompt, skill or MCP server that the kit uses.

## Ask first

- Is Tailwind already set up? Look for `@import "tailwindcss"` in a CSS file and `tailwindcss()` in `vite.config.ts`. Then do nothing.
- Is it a Vite app? The Vite plugin is the vendor's way for Vite and TanStack Start. Other builds: the PostCSS or CLI guide.

## The vendor's steps, reviewed

From Tailwind's "Using Vite" and "TanStack Start" guides: `[V]`

1. `npm install tailwindcss @tailwindcss/vite`.
2. In `vite.config.ts`: `import tailwindcss from '@tailwindcss/vite'`, and `tailwindcss()` in `plugins`, before `tanstackStart()`.
3. In `src/styles.css`: `@import "tailwindcss";`.
4. In `__root.tsx`: `import appCss from '../styles.css?url'`, then `links: [{ rel: 'stylesheet', href: appCss }]` in `head()`.

## Kit rules on top

- Pinned dev dependencies:

  ```sh
  pnpm add -D -E tailwindcss@4.3.5 @tailwindcss/vite@4.3.5
  ```

- Keep both packages on the same version.
- No `tailwind.config.js`. Theme tokens live in CSS (`@theme`), and the app's tokens come from `docs/design.md`. A new token is the person's call.
- shadcn/ui on top? Follow [`shadcn.md`](shadcn.md) after this.

## Verify

- `pnpm build` passes and the built CSS has the utility classes the app uses.
- A page styled with a utility class renders styled in `pnpm dev`.

## Sources

- `tailwindlabs/tailwindcss.com`, commit `7f92c22` (2026-09-09, the latest on main when read): `src/app/(docs)/docs/installation/(tabs)/using-vite/page.tsx`, `src/app/(docs)/docs/installation/framework-guides/tanstack-start.tsx`.
- npm, 2026-11-23: `tailwindcss` and `@tailwindcss/vite` 4.3.5 (MIT).
- tailwindcss.com wasn't reached. `[U]` whether the site matches the repo.

## Follow-up notes for the pack

- No drift. The pack matches the guide: the plugin before `tanstackStart()`, `@import 'tailwindcss'`, and `styles.css?url` in `__root.tsx`. The guide adds `vite-tsconfig-paths`; the pack uses Vite's own `resolve.tsconfigPaths`, which does the same job.
