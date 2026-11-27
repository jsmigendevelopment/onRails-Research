# shadcn/ui: agent setup recipe

Last checked: 2026-11-23. Rules every recipe shares: [`README.md`](README.md). No keys, so no provider file.

**The TanStack Start pack already has shadcn/ui set up** (`components.json`: style `new-york`, Radix, Lucide icons, CSS variables in `src/styles.css`). Use this recipe for an app not made from a pack, or to offer shadcn's agent tools.

## Ask first

- Is there a `components.json`? Then shadcn is set up: add components, never run `init` again. The style can't change after `init`. `[V]`
- New app: which component library? shadcn's `init` now defaults to Base UI (`--base base`, preset `base-nova`); Radix (`--base radix`) is what the pack uses. Recommend Radix, to match the pack and its lint rules.
- Offer the agent tools in plain words: *"shadcn makes a guide for me (a skill) and a way for me to search and add its components (an MCP server). Install them? (Recommended: the MCP server, yes.)"*

## The vendor's steps, reviewed

- New project: `npx shadcn@latest init -t start` (`-t` takes `next`, `start`, `vite`, `react-router`, `laravel` or `astro`; the issue's `-t <framework>`). Existing TanStack Start app: `npx shadcn@latest init`. Both need Tailwind and the `@/*` alias first. `[V]`
- Add a component: `npx shadcn@latest add button`. `[V]`
- MCP server: `npx shadcn@latest mcp init --client claude` writes `.mcp.json` with `npx shadcn@latest mcp`. For Codex, the entry goes in `~/.codex/config.toml` by hand. `[V]`
- Registries go in `components.json` under `registries`. The MCP server can browse and install from them. `[V]`
- Skill: `npx skills add shadcn/ui` (vercel-labs' `skills` installer). It runs `shadcn info --json` each time to read the project. `[V]`

## Kit rules on top

- Pinned, through pnpm. New app, Radix to match the pack:

  ```sh
  pnpm dlx shadcn@4.23.0 init -t start --base radix
  pnpm dlx shadcn@4.23.0 add button
  ```

- **In a pack app, add components through the pack's way** (`stack-tanstack-start`, "adding a shadcn/ui component"). Then run `pnpm check`: lint holds the design tokens and import rules.
- **MCP server, on a yes, pinned:** `claude mcp add --scope project shadcn -- pnpm dlx shadcn@4.23.0 mcp`. Not `@latest`: the server would change under the app. `.mcp.json` is an agent-rules file: its pull request is `needs-human`.
- **Skill, on a yes, at user scope:** `npx skills add shadcn/ui --global`. Never into the repo's `.agents/skills`.
- **Third-party registries are code from strangers.** Add one only when the person names it. Review every file it adds, and check each new npm dependency with the `dependencies` skill.
- Components use the app's design tokens. A new colour, radius or font size is the person's call.

## Verify

- `pnpm dlx shadcn@4.23.0 info` reports the framework, Tailwind v4, the base and the aliases.
- The added component imports from `@/components/ui/<name>`, and `pnpm check` passes.
- With the MCP server: `/mcp` shows `shadcn` connected.

## Sources

- `shadcn-ui/ui`, commit `055aa6b` (2026-11-23): `apps/v4/content/docs/installation/tanstack.mdx`, `(root)/mcp.mdx`, `(root)/skills.mdx`, `(root)/components-json.mdx`, `apps/v4/public/schema.json`, `packages/shadcn/src/commands/init.ts`.
- npm, 2026-11-23: `shadcn` 4.23.0 (MIT, published 2026-10-27, Node >=20.18.1).
- ui.shadcn.com wasn't reached. `[U]` whether the site matches the repo. `[U]` the pinned `mcp` form: the docs show only `@latest`.

## Follow-up notes for the pack

- No drift. `new-york` is still a valid style, and Radix a supported base. shadcn's new default (Base UI, `base-nova`) only matters for new apps.
