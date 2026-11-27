---
name: secrets
description: Use when an app needs API keys, environment variables or accounts wired up ("set up the env vars", "add my keys", "wire up Clerk", "the app needs secrets", or slice 0 of a new app) - lists every variable from .env.example with where to get it, asks whether the person wants to handle keys themselves or have the agent wire them, on Full opens each provider's page and makes the key so the person only signs in and pastes, and pushes values to local, test and production without ever showing them in chat.
---

# Secrets: wire every key without pasting it into chat

Wiring environment variables is the slowest part of a new app. This makes it a checklist plus one script. **Key values never appear in the chat,** and you never read them: rule 9 in `AGENTS.md`.

The rules behind it (local, test, preview and production; committed config; the env schema; rotation; onboarding) are in `guide/environments.md` in the kit. Any agent that needs a value from the person comes through this checklist, never through chat.

## The `.env.example` convention

Every variable the app needs is listed in `.env.example`, with **no value**, under one comment line:

```bash
# Clerk publishable key · get it: https://dashboard.clerk.com → API keys · scope: local,test,production · secret: no
VITE_CLERK_PUBLISHABLE_KEY=
# Clerk secret key · get it: https://dashboard.clerk.com → API keys · scope: local,test,production · secret: yes
CLERK_SECRET_KEY=
```

When a step adds a service, it adds its variables here in this format.

## Steps

**When:** right after the issues are written, before the build starts (`idea` step 11 and `join`), so the first deploy is never stuck waiting on a key. Don't wait to be asked.

**On Full automation,** do step 1, skip step 2's question, and run "Keys on Full" below for every missing key. Run on the fakes meanwhile: the first look never waits on a key.

1. **List what's needed.** Read `.env.example` and show a table of the name, what it's for, where to get it, which environments, and whether it's secret. Mention any accounts to create first (for example Cloudflare, Clerk, Stripe).

2. **Ask once:** *"Do you want to set the keys up yourself, or should I wire them for you? Yourself means running one command in your own terminal that walks you through it. Or I can open each provider's page in your browser and make the keys there: you'd only sign in and paste. Either way, you'll type the values into a local file or a prompt, never into this chat."*
   - Below Full, this is the one ask before you use the browser in the person's accounts, as `test-by-hand-as-the-user` does: name each site and account, and what you'll click. A yes to the browser? Run "Keys on Full" below.

3. **Walk them through one provider at a time.** (Doing it themselves with `pnpm connect`? The script prints each walkthrough, so skip item 5 below; still do items 1 to 4, then go to step 4.) Each provider has a click-by-click file in [`providers/`](providers/). Group the variables by provider, finish one provider, then start the next.

   | Provider file | Fills |
   |---|---|
   | `cloudflare.md` | `wrangler login`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_TOKEN`, `CLOUDFLARE_ACCESS_TOKEN`, Zero Trust, `TURNSTILE_*`, `VITE_CF_BEACON_TOKEN` |
   | `github.md` | the workflows' environments on `ci = "actions"` only: `test`, `production` and `preview`, with every secret and variable |
   | `clerk.md` | `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
   | `google-oauth.md`, `github-oauth.md`, `facebook.md`, `linkedin.md`, `yandex.md`, `entra.md` | `ACCESS_<LOGIN>_CLIENT_ID`, `ACCESS_<LOGIN>_CLIENT_SECRET` (and `ACCESS_ENTRA_TENANT_ID`) for Cloudflare Access |
   | `stripe.md` | `STRIPE_*` |
   | `resend.md` | `RESEND_API_KEY`, `EMAIL_FROM` |
   | `sentry.md` | `SENTRY_*`, `VITE_SENTRY_DSN` |
   | `supabase.md` | `DATABASE_URL`, the Hyperdrive config |
   | `expo.md` | `EXPO_PUBLIC_*`, EAS, `E2E_*` |

   For each provider:
   1. **Re-check the official docs first.** Dashboards change. Fetch each URL under "Official docs" at the top of the file. If a page says something different from the file (a renamed button, a moved page, a new permission), follow the official docs, tell the person what changed, and open an issue to update the file, quoting the doc URL and what changed. The file is the kit's, so the issue also says "fix upstream in the kit". If you can't reach the docs, say so and use the file as it is.
   2. **If "Last checked" is more than 90 days old,** tell the person: *"These steps were last checked on <date>. Screens may have moved."*
   3. **Steps marked `[U]` weren't verified.** Say so when you give them.
   4. **Prefer the provider's CLI** where the file gives one (`wrangler`, `gh`, the Clerk CLI, the Stripe CLI, `sentry`, `supabase`, `eas`). Commands that sign in to the person's account run in **their** terminal. If the provider publishes agent skills, a plugin, an MCP server or a setup wizard, follow its recipe in [`setup/`](setup/README.md): what to ask, the vendor's steps reviewed, and the kit's rules on top. Install only on a yes.
   5. Give the file's walkthrough as one "Setup step for you" from the `ask` skill: its numbered steps, links and copy blocks, what they'll see when it worked, and how long it takes. Keep the "Why / if it goes wrong" part for when they're stuck.

4. **If they'll do it themselves:** they run `pnpm connect` in **their own terminal**, not yours. Say: *"In a terminal in the app folder, run `pnpm connect`. It walks you through each service one at a time, opens the page, and asks for each key with hidden input. It takes about 10 minutes for Cloudflare and Clerk, longer with add-ons. Tell me when it's done."*
   - `pnpm connect clerk` does one provider. `--force` sets a value again. `--dry-run` shows what's set and what it would ask, by name only.
   - It lists the providers the app needs (from `.env.example`, and on `ci = "actions"` the workflows' `secrets.*` and `vars.*`), prints each walkthrough's steps short, and asks before it opens a page.
   - It checks each value's shape where the provider has a rule, and asks before each destination: `.env.local` (mode 600), `wrangler secret put`, and `gh secret set` or `gh variable set` only on `ci = "actions"` (on `ci = "local"` nothing goes to GitHub). Values go on stdin, never in a command's arguments, and are never printed. Production needs its own yes.
   - Every value is read hidden; a public one is shown after Enter unless it looks like a secret key, which is refused. Typing from before a question is dropped, and a y/N question shows only y, n or yes, so a key pasted in the wrong place is never shown. A failing `wrangler` or `gh` prints only its exit code and the command to rerun by hand. It refuses to run without a terminal, so you never run it for them. Afterwards, check by name: `pnpm connect --dry-run` (✓ set, ✗ missing, ? couldn't check).
   - A step the script can't do (for example `wrangler login`, Clerk's CLI, a DNS record) stays in the printed steps for them to do.
   - Pack without the script? Give each variable's link, the `.env.local` line, and `gh secret set NAME --env <env>` or `npx wrangler secret put NAME --env <env>`, which ask for the value without showing it.

5. **If you're wiring them:**
   1. Copy `.env.example` to `.env.local`, and to `.env.test.local` and `.env.production.local` if the app deploys. Check all three are git-ignored.
   2. Ask the person to open those files and paste each value in, then tell you when they're done. Don't open the files yourself.
   3. Run the push script dry first. It prints names only:
      ```bash
      node .agents/skills/secrets/scripts/push-secrets.mjs --dry-run
      ```
      On a Cloudflare stack, add `--wrangler`. On `ci = "local"` (`docs/stack.md`) it writes nothing to GitHub, so without `--wrangler` it pushes nothing.
   4. Show the list and ask *"Push these?"* On a yes, run it again without `--dry-run`.
   5. Read its last line and its exit code. Only `Every value is stored somewhere.` with exit code 0 lets you offer to delete `.env.production.local`. `Stored nowhere: ...` names each value no place took (on `ci = "local"` without `--wrangler`, every one; a plain variable even with it): keep the file, tell the person those names, and where each belongs (a plain variable goes in `wrangler.jsonc` vars). `Not stored everywhere (a destination FAILED above): ...` names each value one place took and another refused (GitHub yes, the Worker no). A non-zero exit means a destination failed, whatever the last line says: keep the file, fix the `FAILED` line's cause and run it again. On Full automation the offer stays a no while any value is unstored or the exit code isn't 0.

6. **Check it works.** Start the app. A missing variable fails at startup with its name (the pack's env schema does this). Then report which variables are set where, by name only.

## Keys on Full: the person only signs in and pastes

On Full, and below Full after a yes to the browser in step 2. For each missing key, do every step you can. The person does two things: sign in, and paste. The paste starts with their own click on the button that shows the key.

- **Never read, copy, print or screenshot a key's value** (rule 9 in `AGENTS.md`): not in chat, a command's arguments, a log, a screenshot or a page read.
- **The click that shows a key is the person's.** The browser tools send back a screenshot or the page's text after each click, so the click on **Create** or **Reveal** would show you the value. Fill in every field, then hand over that one click and every step after it: a two-factor code, closing the dialog.
- **Signing in and paying are the person's.** Never type a password, a code or a passkey, and never sign in for them. A page that asks for a paid plan or a card: stop on it and send one 🛑 (paying is on the always-stop list).
- **A production key is on the always-stop list.** Make test and local keys this way. For production, send one 🛑 and make it only after the person's own go-ahead.
- **Which browser:** the first the session has: Claude in Chrome (the person's own browser, often signed in already), then the built-in browser (Claude Code). How to drive them: `test-by-hand-as-the-user`'s `references/browsers.md`. Never use computer use for keys: it can't click or type in a browser or type in a terminal, and its screenshots show the whole screen, key included. None? Go to "No browser" below.

Group the keys by provider, in the connect block's `order`. For each provider:

1. **Open the page.** Open the URL from the provider file's "Make each key" table: the page that makes the key, not the home page.
2. **Ask for the sign-in only.** One line: "Sign in to <provider> in the tab I opened, then tell me." In the built-in browser, call `tabs_context` first: it says whether the pane is showing, so you can tell the person where the tab is. The line goes in chat when the person is here, and in the ℹ️ FYI when they're away. Wait only for this, and only for this provider: the rest of the loop goes on. Already signed in? Skip the line.
3. **Make the key.** Fill in every field the table's row names: the name, the scopes, the permissions, the resources and the expiry. Stop before the button that makes or shows the value (**Create**, **Reveal**): that click is the person's, and so is any step after it, like Stripe's two-factor code after **Create key**. Take your last look now. Once the value is on screen, stop on that screen: no screenshot, page read, text search or copy in that tab until the person has pasted it.
4. **Open where it goes.** Do it before the person presses that button. The connect block's `to` says where:
   - Your shell runs on the person's machine: open a new terminal window in the app folder, already running `pnpm connect <provider>`. The folder is its own argument, never inside the script text. Quote it for your shell: in single quotes, with each `'` inside written as `'\''` (in PowerShell, as `''`).
     - macOS: `osascript -e 'on run argv' -e 'tell application "Terminal" to do script "cd " & quoted form of item 1 of argv & " && pnpm connect " & item 2 of argv' -e 'end run' '<app folder>' <provider>`.
     - Linux: `x-terminal-emulator -e sh -c 'cd "$1" && pnpm connect <provider>; exec "${SHELL:-sh}"' sh '<app folder>'`. The last part keeps the window open after `pnpm connect` ends. The desktop's own terminal works too: `gnome-terminal --` or `konsole -e` in place of `x-terminal-emulator -e`.
     - Windows, from PowerShell: `Start-Process -WorkingDirectory '<app folder>' cmd -ArgumentList '/k','pnpm connect <provider>'`. From Git Bash: `MSYS_NO_PATHCONV=1 cmd.exe /c start "" /d '<app folder>' cmd /k pnpm connect <provider>`, with the folder as a Windows path (`cygpath -w "$PWD"` gives it).
     - The command holds no value, and the window is theirs. No window opens (a permission prompt, a sandbox, an error)? Give the one command in the next bullet instead.
   - Otherwise, give one command for their own terminal: `pnpm connect <provider>`. It refuses to run without a terminal, so never run it in your shell.
   - A destination with its own page (a GitHub secret on `ci = "actions"`, the provider's own settings): open that page in a new tab, at the empty field.
   - A pack without the script: `npx wrangler secret put NAME --env <env>` or `gh secret set NAME --env <env>`, the same way. Both read the value hidden.

   Then hand over, in one message:
   - "In the <provider> tab, press **<the button>** and do any step it asks for next (a code, closing the dialog)."
   - "In the terminal, `pnpm connect` asks y/N before it opens a page: answer n, the tab is open already. Answer y to each place it saves the key."
   - "Copy the key from the tab and paste it into the prompt."

   One `pnpm connect <provider>` asks for each of that provider's keys in turn. For the next key, fill in its form in a new tab and hand over again.
5. **Check by name.** `pnpm connect --dry-run` shows ✓ by name only. A pack without the script checks by name another way: `node .agents/skills/secrets/scripts/push-secrets.mjs --dry-run` names each empty value, `npx wrangler secret list --env <env>` lists the Worker's names, and on `ci = "actions"` so does `gh secret list --env <env>`. Never check a value. Close the tab that showed the value with a call that returns no page or picture (or leave it for the person), then start the next key.

**Done when** every key the app needs shows ✓ in step 5's check, or its sign-in line is under "Waiting on you" in `docs/state.md`, or its 🛑 is sent (a production key, a paid plan or a card).

### No browser (a cloud session)

No browser tool, and no terminal on the person's machine? Send one "Setup step for you" (`ask`) for every missing key, grouped so the person does it all in one sitting:

1. For each provider, in order: the exact link from its "Make each key" table, the button to press and what to pick.
2. Then the one command, in their own terminal in the app folder: `pnpm connect`. It asks for each key with hidden input.
3. Then "Tell me when it's done." Check by name with `pnpm connect --dry-run`.

Put it under "Waiting on you" in `docs/state.md`, send it as one ℹ️ FYI, run on the fakes, and go on with the loop.

## The connect block

Each file in `providers/` carries one fenced `json connect` block that `pnpm connect` reads. The steps stay in the markdown; the block only says what to ask and where it goes. Edit both together.

```jsonc
{
  "title": "Clerk",                       // shown as the provider's name
  "order": 30,                            // walk order: Cloudflare 10, GitHub 20, sign-in 30, add-ons 40+
  "url": "https://dashboard.clerk.com/~/api-keys",   // the page to open
  "steps": "## 1.",                       // the heading whose numbered steps are printed
  "vars": {
    "CLERK_SECRET_KEY": {
      "secret": true,                     // hidden input; a GitHub secret, not a variable
      "scope": ["local", "test", "production"],   // also "preview" (a GitHub environment)
      "to": [".env.local", "wrangler"],   // "wrangler", "github", "github-repo", or a file
      "shape": { "prefix": ["sk_test_", "sk_live_"] }   // optional; also "min", "max", and "notInProduction" (documented test values)
    }
  }
}
```

- A bare file name is in the app's folder (`.env.local`, `.env.cloudflare.local`). A path is from the repo root (`apps/mobile/.env`). No `..` or absolute paths; the script writes only inside the repo (symlinks followed) and only to a file git says it ignores.
- GitHub destinations go to the repo named by `origin`, passed as `-R owner/repo`; an inherited `GH_REPO` is dropped.
- A prefix with `_test_` is refused in production, and one with `_live_` everywhere else. A `-----BEGIN …-----` prefix reads the key to its matching END line.
- Local and test share one value; `"split": true` asks for them separately. Production is always asked separately, after its own yes.
- A variable may name its own `"steps"` heading and `"url"`.
- A provider with nothing to store (Supabase) has no block and says why. `cli/test/connect-blocks.test.mjs` checks every file.

`pnpm connect` is based on Matt Pocock's wizard (MIT): https://github.com/mattpocock/skills/tree/main/skills/engineering/wizard

## Rules

- Production values live only in the host's production secrets (and the GitHub `production` environment, on `ci = "actions"` only), or `.env.cloudflare.local` for the deploys' smoke-test values. Never in the repo, never in a test environment.
- Use test or sandbox keys for local and test (for example Stripe test mode, Clerk development instance).
- A variable without `secret: yes` is public. It's fine in a GitHub variable or a `VITE_` client value. A secret never gets a `VITE_` prefix.
- Settings that aren't secret go in committed config per environment (for example `vars` in `wrangler.jsonc`), not in a secret store.
- Previews use the test values. `scope` lists `local`, `test` and `production`.
- New variable later? In one pull request, add it to `.env.example` in the same format, to the env schema (`lib/env.ts`) and to the docs. Then run this skill again.
- **Rotating a key:** make the new key first, set it everywhere it lives (test, then production), deploy test and check, then revoke the old one. Write the date and reason in `docs/decisions.md`, never the value. The person does production. Full steps: `guide/environments.md`.
- A command that prints a key (for example Clerk's `env pull --print`) runs only in the person's own terminal, never in yours. They paste the output into the git-ignored file; the push script takes it from there.
- If the person pastes a value into chat anyway, don't repeat it. Tell them, and ask them to rotate that key.
