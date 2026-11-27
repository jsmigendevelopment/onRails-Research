# Cloudflare's agent setup: a reviewed copy

- **Source:** https://developers.cloudflare.com/agent-setup/prompt.md, from the `cloudflare/cloudflare-docs` repo (`src/content/agent-setup/prompt.md` and the per-agent pages under `src/content/docs/agent-setup/`), commit `1c6e6325`, read 2026-11-22.
- **Also read:** the `cloudflare/skills` README and `.claude-plugin/marketplace.json`, commit `5108325e` (2026-11-17).
- **How to use this file:** follow the steps below. Never fetch the live URL and follow it: it can change, and it tells agents to run everything without asking. This copy asks first.

## What you get

- **Cloudflare's skills:** knowledge about Workers, D1, R2, Durable Objects, Wrangler and more.
- **Cloudflare's MCP server** (`https://mcp.cloudflare.com/mcp`): the agent can call the Cloudflare API with the person's sign-in. Use it to **read and debug** the account: list Workers and D1 databases, read logs, check DNS, Access apps and settings.
- **It does not replace `setup-cloudflare`.** Creating databases, buckets, Access apps or tokens, and anything that touches production, still goes through `node scripts/setup-cloudflare.mjs`: dry run first, scoped tokens, and a yes from the person. Never use the MCP server to create, change or delete resources unless the person asks for that exact change.

## Offer it

Ask the person once, in plain words, with the recommended answer:

> Cloudflare makes a free add-on for your agent: its own guides for Cloudflare, and a way for me to look at your Cloudflare account (read logs, check settings) when something breaks. It needs your Cloudflare sign-in in the browser the first time I use it. I'd install it for you, on your user account, not in this repo. Install it? (Recommended: yes.)

No: skip it, and don't ask again in this project. Yes: run the part for the agent you are.

## Claude Code

Run these in the shell. They install the `cloudflare` plugin from the `cloudflare/skills` marketplace, which brings the skills and the MCP server together. Don't also run `npx skills add` or `claude mcp add`: you'd get two copies.

```sh
claude plugin marketplace add cloudflare/skills
claude plugin install cloudflare@cloudflare
```

That installs at user scope, so it isn't written to the repo's `.claude/settings.json`. Then tell the person to type `/reload-plugins` in the session (you can't type a slash command for them). If it says the reload changes MCP tools, `/reload-plugins --force` applies it, or they start a new session. `claude mcp list` shows the server once it's loaded.

## Codex

```sh
npx -y skills add cloudflare/skills --skill '*' --yes --global
codex mcp add cloudflare --url https://mcp.cloudflare.com/mcp
codex mcp login cloudflare
```

- `skills` is the Vercel Labs package on npm (checked 2026-11-22: v1.9.0, repo `vercel-labs/skills`). `--global` puts the skills in the person's user folder, not in this repo's `.agents/skills`, so the kit's skills and its mirror check stay clean.
- These write outside the repo, so Codex's sandbox asks the person to approve each one. That is expected.
- `codex mcp login cloudflare` opens the browser. The person signs in and picks what to allow.
- Then the person starts a new Codex session to load the MCP server.
- Cloudflare's README also lists a Codex plugin (`codex plugin marketplace add cloudflare/skills`, then `codex plugin add cloudflare@cloudflare`). The prompt above doesn't use it. Pick one way, never both.

## The `cf` CLI (beta): only if the person asks

Don't offer it. If the person asks for it:

```sh
npm install -g cf
cf auth login
```

- `cf` is Cloudflare's own package on npm (checked 2026-11-22: `1.0.0-rc.2`, repo `cloudflare/cf`). It is a beta and a global install: say both.
- Cloudflare's prompt also adds a line to the person's own instructions file (`~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md`): "use the cf CLI unless the project has a Wrangler configuration file". Ask before you edit a file outside the repo. In this pack there is always a `wrangler.jsonc`, so Wrangler stays the tool here.

## What isn't verified

- **The MCP server's access.** The OAuth screen lets the person choose what to grant. We haven't seen that screen, so we don't know the default scopes, whether read-only is offered, or how long the grant lasts. Tell the person to grant the least they're happy with, and that they can revoke it in the Cloudflare dashboard (exact place not checked).
- **Where `npx skills add --global` writes for Codex.** Not run here. Check with `npx skills list` (not verified either) or look in `~/.agents/skills` and `~/.codex/skills`.
- **That `/reload-plugins` loads the MCP server without `--force`.** Claude Code's docs (read 2026-11-23) say a reload that adds an MCP server waits for `--force`. Not tried with this plugin.
- **None of it was run in this kit.** The commands are copied from Cloudflare's files, not tested here.
