# Stripe: agent setup recipe

Last checked: 2026-11-23. Rules every recipe shares: [`README.md`](README.md). Keys: [`../providers/stripe.md`](../providers/stripe.md). Used by the `stripe` add-on.

## Ask first

- Does the person have a Stripe account? If not, they sign up themselves. Never create an account or a sandbox for them without a yes.
- Offer Stripe's agent tools in plain words: *"Stripe makes an add-on for your agent: its guides, a planner that suggests which Stripe products fit your business, and a way for me to look at your Stripe test data. It installs on your user account, not in this repo. Install it? (Recommended: yes.)"*
- Before the planner runs: *"I'll send Stripe a short summary of what you sell, to whom and how they pay, from `docs/vision.md`. Here it is. OK to send?"* Show the summary first.

## The vendor's steps, reviewed

Stripe's entry point is three steps: install the CLI globally (`npm install -g @stripe/cli`), run `stripe agent setup`, then plan with the business context.

- **`stripe agent setup`** detects the agents installed and sets each one up. `[V]` (`pkg/cmd/agent.go` at tag v1.55.14)
  - Claude Code: `claude plugin install stripe@anthropic-plugin-directory`. Codex: `codex plugin add stripe@openai-curated` (or `openai-api-curated`). Cursor has its own plugin.
  - An agent with no Stripe plugin gets Stripe's skills instead, fetched from `docs.stripe.com/.well-known/skills/` into `.agents/skills`, in the project or in the home folder.
  - Flags: `--status` (check, change nothing), `--client claude_code|codex_cli|cursor`, `--yes` (every detected client), `--force`, `--json`.
- **The plugin** brings Stripe's skills and its MCP server, `https://mcp.stripe.com` (HTTP, signs in through the browser). `[V]` (`stripe/ai`, `providers/claude/plugin`)
- **The planner** is the `stripe-implementation-planner` skill. It gathers the business model, how customers pay, direct or platform, channels and countries, then runs `stripe tools plan --message "<context>"`. If the CLI isn't there, it falls back to the `stripe_implementation_planner` MCP tool. If there's no account, it runs `stripe sandbox create`. `[V]` the skill's text; `[U]` the `tools plan` command itself (not in the CLI's source at v1.55.14, so likely fetched at runtime).
- **The CLI on npm** is a shim that runs the binary from a per-platform optional dependency. Its postinstall is only a download fallback, so it works under pnpm's blocked install scripts. `[V]` (the 1.55.14 package)

## Kit rules on top

- **No global CLI.** Run it pinned:

  ```sh
  pnpm dlx @stripe/cli@1.55.14 --version
  pnpm dlx @stripe/cli@1.55.14 agent setup --status
  ```

  Or as a dev dependency: `pnpm add -D -E @stripe/cli@1.55.14`, then `pnpm exec stripe ...`. `[U]` not run here.
- **Agent setup, on a yes, one client:** `pnpm dlx @stripe/cli@1.55.14 agent setup --client claude_code` (or `codex_cli`). Never `--yes`: it sets up every agent on the machine.
- **Skills fallback goes to the home folder, never the project.** The project choice writes into `.agents/skills`, the kit's folder.
- **Sign-in runs in the person's terminal:** `pnpm dlx @stripe/cli@1.55.14 login`. The MCP server's browser sign-in is theirs too. Grant test mode only.
- **The planner's business context comes from `docs/vision.md`**, summarised: what's sold, to whom, one-time or recurring, direct or marketplace, online or in person, countries and currencies. Never hard-code it in the kit or a skill. No people's names, emails or keys in the message.
- **The plan is advice.** Write the accepted choice to `docs/decisions.md`. The `stripe` add-on's code (Checkout, the portal, the signed webhook) stays the integration unless an issue says otherwise.
- **`stripe sandbox create` creates an account resource.** Ask first, and prefer the person's own test mode.
- **The MCP server reads and changes the account.** Use it on test data, read-only by default. Never create, refund or delete live objects through it.
- Test keys only until launch. Live keys and `STRIPE_ALLOW_LIVE` go through the `secrets` checklist, by the person.

## Verify

- `pnpm dlx @stripe/cli@1.55.14 agent setup --status` shows the plugin installed for the chosen agent.
- `/mcp` (Claude Code) shows `stripe` connected after sign-in.
- The add-on's own check: subscribe on `/billing` with card `4242 4242 4242 4242` and the page shows Active.

## Sources

- `stripe/stripe-cli`, tag v1.55.14 and main `ace4551` (2026-11-21): `pkg/cmd/agent.go`, `pkg/agentsetup/claude.go`, `codex.go`, `pkg/agentskills/agentskills.go`.
- `stripe/ai`, commit `2815b93` (2026-11-23): `skills/stripe-implementation-planner/SKILL.md`, `providers/claude/plugin/.mcp.json` and `.claude-plugin/plugin.json` (plugin 0.15.3, MIT).
- npm, 2026-11-23: `@stripe/cli` 1.55.14 (MIT, published 2026-11-19); `@stripe/mcp` 0.3.4 says it's deprecated in favour of the hosted server.
- docs.stripe.com wasn't reached. `[U]` Stripe's own pages on agent setup.
