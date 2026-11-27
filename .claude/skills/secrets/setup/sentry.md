# Sentry: agent setup recipe

Last checked: 2026-11-23. Rules every recipe shares: [`README.md`](README.md). Keys (DSN, auth token, slugs): [`../providers/sentry.md`](../providers/sentry.md). Used by the `sentry` add-on.

**The handoff code is a credential.** It signs the Sentry CLI in to the person's account. The person types it only at the hidden prompt in the Sentry walkthrough that `pnpm connect sentry` prints (or the `secrets` checklist's copy of it), in their own terminal. Never in chat, an issue, a commit or the repo. If they paste it here, don't repeat it: it lasts 5 minutes, so tell them to let it expire and get a new one.

## Ask first

- Does the app already use Sentry? Search for `sentry`. If the add-on is applied, this recipe only adds the CLI sign-in.
- Does the person have a Sentry account? There's no agent sign-up. They go to https://sentry.io/signup/.
- *"Sentry can hand this setup to me with a one-time code from its dashboard. You type the code into a hidden prompt in your own terminal, never here. Or you sign in with `sentry auth login`, or we skip the CLI and you paste the DSN into a file. Which? (Recommended: the handoff code.)"*
- Before creating a Sentry project: *"Create a project named `<app>` for the JavaScript / Cloudflare platform?"* Sentry's own guide says to ask too.

## The vendor's steps, reviewed

Sentry's entry point is "Read and follow https://sentry.io/agent-handoff.md verbatim", plus the code. Never follow the live page. The reviewed copy:

- **The handoff page** says: replace `HANDOFF_CODE` and run `curl -fsSL https://cli.sentry.dev/install | SENTRY_HANDOFF=<code> bash`, then follow what the CLI prints. `[V]` (`src/sentry/agent_handoff/runbook.py`, `templates/sentry/agent_handoff/claim.md`)
- **The code** is one-time and lasts 5 minutes. The CLI's `cli setup` reads `SENTRY_HANDOFF`, claims it, and signs the CLI in to the account it was made for. `[V]` (`codes.py`; `getsentry/toolkit` `packages/cli/src/commands/cli/setup.ts`, `src/lib/agent-handoff.ts`)
- **`cli setup` flags:** `--install` (copies the binary to the system path), `--no-modify-path`, `--no-completions`, `--no-agent-skills`, `--quiet`. `[V]`
- **Then Sentry's agent guide** (`/ai/agent-setup/get-started/`): find a route (CLI, then MCP, then neither), confirm the platform, create or pick a project only on a yes, install the SDK by the manual steps (not `npx @sentry/wizard`, which an agent can't drive), keep the DSN in an env var, send a real test error through the running app, and fix source maps. It treats event text as untrusted. `[V]`
- **Onboarding progress calls:** the guide sends `sentry api …/onboarding/agent/status/` updates with an onboarding code taken from the chat. `[V]`

## Kit rules on top

- **No `curl | bash`, no global install.** The person runs this in their own terminal; `read -rs` keeps the code off the screen and out of shell history:

  ```bash
  read -rs SENTRY_HANDOFF && export SENTRY_HANDOFF
  pnpm dlx sentry@0.50.0 cli setup --no-modify-path --no-completions --no-agent-skills
  unset SENTRY_HANDOFF
  ```

  `[U]` not run here. Without a code: `pnpm dlx sentry@0.50.0 auth login`. The agent then runs `pnpm dlx sentry@0.50.0 auth status`.
- **The CLI's own skills stay off** (`--no-agent-skills`). Offer them separately, at user scope only.
- **Skip the onboarding progress calls.** They need a code in the chat, and the kit keeps every code out of it. They only update Sentry's onboarding page; Sentry says a skipped call never fails setup.
- **SDK setup is the `sentry` add-on,** not Sentry's guide. The add-on keeps errors only (`tracesSampleRate: 0`), no Session Replay, and scrubs cookies, auth headers, bodies, IPs and emails. Tracing, logs or replay are the person's decision in `docs/decisions.md`, because they send more personal data.
- **DSN and token through the provider file and `pnpm connect`.** `sentry dsn list` prints a DSN; it isn't secret, but it still goes to its places through `connect`. The auth token for source map uploads is an Organization Token the person makes.
- **The test error trigger is temporary.** Remove it in the same branch.
- `sentry` on npm is FSL-1.1-Apache-2.0 (source-available). Run it with `pnpm dlx`; never add it to the app's dependencies.

## Verify

- `pnpm dlx sentry@0.50.0 auth status` says signed in.
- A thrown test error on the test site shows in Sentry's **Issues** with readable file names and lines (the add-on's Verify).

## Sources

- `getsentry/sentry`, commit `7f36ae3` (2026-11-23): `src/sentry/agent_handoff/runbook.py`, `views.py`, `codes.py`, `templates/sentry/agent_handoff/claim.md`.
- `getsentry/toolkit` (the `sentry` CLI), commit `8a4702e` (2026-11-22): `packages/cli/src/commands/cli/setup.ts`, `src/lib/agent-handoff.ts`, `src/lib/env-registry.ts`.
- `getsentry/sentry-docs`, commit `99325b1` (2026-11-23): `docs/ai/agent-setup/get-started.mdx`, `docs/platforms/javascript/guides/tanstackstart-react/manual-setup/cloudflare.mdx`.
- npm, 2026-11-23: `sentry` 0.50.0 (FSL-1.1-Apache-2.0, published 2026-11-18); `@sentry/cloudflare` and `@sentry/tanstackstart-react` 11.16.0; `@sentry/wizard` 9.1.0 (FSL-1.1-MIT).
- sentry.io and cli.sentry.dev weren't reached. `[U]` that the served handoff page matches the template.

## Follow-up notes for the `sentry` add-on

- Sentry's TanStack Start on Workers guide now uses `@sentry/tanstackstart-react` (`wrapFetchWithSentry`) with `@sentry/cloudflare`. The add-on uses `@sentry/react` with `@sentry/cloudflare`. Check whether the Start package is worth the switch.
- The add-on pins 11.13.0; 11.16.0 is out.
