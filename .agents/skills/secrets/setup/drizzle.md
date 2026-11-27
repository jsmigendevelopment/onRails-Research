# Drizzle: agent setup recipe

Last checked: 2026-11-23. Rules every recipe shares: [`README.md`](README.md). No keys, so no provider file.

**The TanStack Start pack already uses Drizzle with D1** (`drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, `drizzle.config.ts`, `pnpm db:generate`). Use this recipe for an app not made from a pack, or to offer Drizzle's agent tools.

## Ask first

- Is Drizzle already in the app? Check `package.json` and the lockfile. In a pack app, skip to the agent tools.
- Which database? Pick the matching "Get started" page on orm.drizzle.team. D1 in the pack.
- Offer Drizzle's agent tools in plain words: *"Drizzle makes a guide for me (a skill) and a way for me to run its migration tool from chat (an MCP server). They need Drizzle 1.0, which is still a release candidate. Install them? (Recommended: not yet, while the app is on 0.x.)"*

## The vendor's steps, reviewed

Drizzle's entry point is "Fetch and follow https://orm.drizzle.team/agent-setup/prompt.md". Never follow the live URL. The reviewed copy of what it says:

- It sets up agent tools only. It never changes the schema, config, migrations or the database. `[V]`
- **It needs `drizzle-orm@rc` and `drizzle-kit@rc` (1.0.0-rc.6 on 2026-11-23).** On a 0.x install it says to stop: upgrading is a separate task. `[V]`
- Skill: `pnpm exec drizzle-kit skills`. It runs the third-party `skills` installer from vercel-labs (`skills@latest`, unpinned) to copy the skill bundled in the installed Kit. `[V]`
- MCP server: the project's own Kit over stdio, never a downloaded copy. For Claude Code, from the package that owns Drizzle: `claude mcp add --transport stdio --scope project drizzle -- npx --no-install drizzle-kit mcp`, which writes `.mcp.json`. For Codex, a `[mcp_servers.drizzle]` entry in the project's `.codex/config.toml`. `[V]`
- Verify by listing the server's tools. Never call a migration tool to test the connection. `[V]`

New app on 0.x (stable), as Drizzle's D1 page and the pack do it:

```sh
pnpm add -E drizzle-orm@0.45.4
pnpm add -D -E drizzle-kit@0.31.11
```

## Kit rules on top

- **Stay on the stable 0.x line** until 1.0 is released or the person decides otherwise in `docs/decisions.md`. A 1.0 upgrade is its own issue.
- **On 1.0 rc, skills:** the installer asks which agent and scope. Pick user scope. Project scope would write into `.agents/skills`, the kit's folder.
- **On 1.0 rc, MCP:** pnpm form: `claude mcp add --transport stdio --scope project drizzle -- pnpm exec drizzle-kit mcp`. `.mcp.json` is an agent-rules file: its pull request is `needs-human`.
- **The MCP server can write migration files and change the database its config points at.** Use it on local D1 only. Migrations reach test and production through the pack's deploy scripts (`pnpm deploy:test`, `pnpm deploy:production`), never through chat.
- **No `d1-http` driver credentials.** Drizzle's D1 page puts an account ID, database ID and token in `drizzle.config.ts`. The pack generates SQL and lets `wrangler d1 migrations apply` run it, so no token is needed.
- Tables follow `guide/app-conventions.md` (snake_case plurals, `created_at`, forward-only migrations). Use `pnpm new:table` in a pack app.

## Verify

- `pnpm exec drizzle-kit --version` prints the pinned version.
- `pnpm db:generate` writes SQL to `migrations/`, and `pnpm check:migrations` passes.
- With the MCP server: `/mcp` in Claude Code shows `drizzle` connected and its tools listed.

## Sources

- `drizzle-team/drizzle-orm-docs`, commit `fb09abd` (2026-11-21): `public/agent-setup/prompt.md`, `src/content/docs/drizzle-kit-skills.mdx`, `drizzle-kit-mcp.mdx`, `get-started/d1-new.mdx`.
- npm, 2026-11-23: `drizzle-kit` latest 0.31.11 (MIT), rc 1.0.0-rc.6 (peer `drizzle-orm >=1.0.0-rc.5`); `drizzle-orm` latest 0.45.4 (Apache-2.0).
- orm.drizzle.team itself wasn't reached. `[U]` whether the served prompt matches the repo copy.

## Follow-up notes for the pack

- Drizzle's agent tools need 1.0 rc; the pack is on 0.x. Re-check when 1.0 is stable, as its own issue.
