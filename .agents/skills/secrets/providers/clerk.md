# Clerk

Last checked: 2026-11-23. Official docs:
- https://clerk.com/docs/cli
- https://clerk.com/docs/getting-started/quickstart/setup-clerk
- https://clerk.com/docs/guides/development/managing-environments
- https://clerk.com/docs/guides/development/deployment/production
- https://clerk.com/docs/guides/development/deployment/expo
- https://clerk.com/docs/guides/development/clerk-environment-variables
- https://clerk.com/docs/guides/sessions/manual-jwt-verification
- https://clerk.com/docs/guides/dashboard/dns-domains/subdomain-allowlist
- https://clerk.com/docs/guides/sessions/customize-session-tokens and https://clerk.com/docs/guides/sessions/jwt-templates (shortcodes), read 2026-11-23 from `clerk/clerk-docs` main
- Clerk's agent-setup prompt, `prompts/cli-setup.md` in `clerk/clerk-docs`
- `clerk env pull` and the framework table in `clerk/cli` (`packages/cli-core/src/commands/env/README.md`, `src/lib/framework.ts`)
- The TanStack Start quickstart (`docs/getting-started/quickstart.tanstack-react-start.mdx` in `clerk/clerk-docs`) and the SDK's env reader (`packages/tanstack-react-start/src/utils/env.ts` in `clerk/javascript`: `VITE_CLERK_PUBLISHABLE_KEY` first, then `CLERK_PUBLISHABLE_KEY`)

How: clerk.com was blocked here, so these were read from Clerk's public repos (`clerk/clerk-docs`, commit of 2026-11-22; `clerk/cli`, commit of 2026-11-20; `clerk/javascript`, commit of 2026-11-22). `[V]` = matches that source. `[U]` = not checked. Nothing here was run against a real Clerk account.

**What it's for.** Sign-in. The pack reads:

```text
VITE_CLERK_PUBLISHABLE_KEY   pk_test_... or pk_live_...   public
CLERK_SECRET_KEY             sk_test_... or sk_live_...   secret
CLERK_JWT_KEY                optional, the JWKS Public Key (PEM), public
```

These are Clerk's own names for TanStack Start: its quickstart's `.env`, and what `clerk env pull` writes (`framework.ts` in `clerk/cli`). `[V]` The Worker reads the publishable key at runtime despite the `VITE_` prefix; it's public either way. The pack's old name, `CLERK_PUBLISHABLE_KEY`, still works, with one warning in the Worker log (`env_name_deprecated`): rename it when you next touch the file.

The mobile app (monorepo pack) reads `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: the same key as the web app. Clerk's CLI writes that name for Expo too. `[V]`

**Which keys where.** A Clerk app has two instances. `[V]`

| Where | Instance | Keys |
|---|---|---|
| local, test (workers.dev), previews | Development | `pk_test_`, `sk_test_` |
| production on your own domain | Production | `pk_live_`, `sk_live_` |

Production keys need a domain you own and can add DNS records to. They don't work on a host's shared domain such as `*.workers.dev`. `[V]` (Clerk names `*.vercel.app`; workers.dev is the same case.)

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Clerk",
  "order": 30,
  "url": "https://dashboard.clerk.com/~/api-keys",
  "steps": "## 1.",
  "vars": {
    "VITE_CLERK_PUBLISHABLE_KEY": {"secret": false, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"], "shape": {"prefix": ["pk_test_", "pk_live_"]}},
    "CLERK_SECRET_KEY": {"secret": true, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"], "shape": {"prefix": ["sk_test_", "sk_live_"]}},
    "CLERK_JWT_KEY": {"secret": false, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"], "shape": {"prefix": ["-----BEGIN PUBLIC KEY-----"]}}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Clerk's docs on 2026-11-26. Production keys are section 2, after the person's go-ahead.

| Variable | Open | Pick |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | https://dashboard.clerk.com/~/api-keys | The app, then the **Development** instance (the menu at the top). The publishable key (`pk_test_`) is in **Quick copy**: nothing to make, and it's public. `[V]` |
| `CLERK_SECRET_KEY` | https://dashboard.clerk.com/~/api-keys | The **Development** instance. No scopes to pick: a secret key reaches the whole instance. Stop there: the person presses **Insert a new secret key** in **Quick copy**. Shown once (`sk_test_`). `[V]` page, `[U]` button name. |
| `CLERK_JWT_KEY` | https://dashboard.clerk.com/~/api-keys | Optional. The **Development** instance's **JWKS Public Key** (PEM). Nothing to make, and it's public. `[V]` |

## Clerk's CLI, and its agent prompt (reviewed copy)

Clerk publishes a CLI and a setup prompt for agents. This is the part that fits this kit, checked against the sources above on 2026-11-23. `[V]` unless marked.

- Run it with `pnpm dlx clerk@latest` (npm: `npx -y clerk@latest`). Never install it globally.
- **This pack already has Clerk wired.** That's Clerk's "existing Clerk project" case: **never run `clerk init`.** A signed-out `init` can make a second app and replace the keys.
- **Accountless (keyless) mode doesn't apply to this pack.** `init` and the SDK can make a claimable app with temporary keys and no account. But the pack turns Clerk off unless both keys are set (`src/server/auth.ts`, read on 2026-11-23), so with no keys there's no sign-in at all, keyless or not. Local dev without a Clerk account works; sign-in is just off.
- **Clerk's agent skills.** `npx skills add clerk/skills`. Offer them; install only on a yes.
- **Agent rules from Clerk's prompt that the kit keeps:** never read env files or the claim files (`.clerk/keyless.json`, `.clerk/.tmp/keyless.json`); never choose an app for the person; never pull production keys without `--print`; never write your own pipe into a host's CLI.
- Other commands: `clerk doctor` (checks the setup), `clerk config pull` and `clerk config patch --dry-run` (sign-in options), `clerk enable orgs`, and for tests in an automated browser `clerk users create --email <unique>+clerk_test@example.com --password <random> --yes` with code `424242`. Ask before creating users in an existing app.

Not copied on purpose: Clerk's Next.js, Vercel and iOS steps, and anything naming one person's app.

## 1. Development keys (local, test, previews) · about 5 minutes

1. Make an account and an app (skip if you have one): https://dashboard.clerk.com/sign-up, then the **Create application** card. Pick how people sign in (email, Google and so on). `[V]`
2. In your own terminal, in the app folder, sign the CLI in and pick the app:
   ```bash
   pnpm dlx clerk@latest auth login
   pnpm dlx clerk@latest apps list --json
   pnpm dlx clerk@latest link --app <the app id you chose>
   ```
3. Pull the development keys into the local file, and into the test file the secrets script reads. The agent may run these: they write files and print no values. They write `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, the names the pack reads, so nothing needs renaming. `[V]` flags and names:
   ```bash
   pnpm dlx clerk@latest env pull --instance dev
   pnpm dlx clerk@latest env pull --instance dev --file .env.test.local
   ```
4. Optional, for `/api/v1` without a call to Clerk: on https://dashboard.clerk.com/~/api-keys copy the **JWKS Public Key** into `CLERK_JWT_KEY` in the same files. `[V]` page, `[U]` exact label placement.
5. Check:
   ```bash
   pnpm dlx clerk@latest doctor
   ```

No CLI? Open https://dashboard.clerk.com/~/api-keys. In **Quick copy**, click **Insert a new secret key**, copy both keys into `.env.local` and `.env.test.local`. The secret key is shown once. `[V]`

When it worked: `pnpm dev` shows a sign-in button, and you can sign up. The keys start with `pk_test_` and `sk_test_`.

## 2. Production keys (only with your own domain) · about 15 minutes, plus DNS time

This is a production step: the person says yes first (always-stop list).

1. Make the production instance. The agent can run this after the person names the domain:
   ```bash
   pnpm dlx clerk@latest deploy --mode agent --domain <your domain>
   ```
   Follow each `nextAction` in its JSON report: the DNS records to add and the OAuth credentials to enter. In the dashboard instead: the **Development** menu at the top → **Create production instance**. `[V]`
2. Add the DNS records it lists (or see https://dashboard.clerk.com/~/domains). It can take up to 48 hours. Check:
   ```bash
   pnpm dlx clerk@latest deploy status --mode agent
   ```
   It exits 0 only when production is complete. `[V]`
3. **The person, in a separate terminal of their own, not the agent's session:**
   ```bash
   pnpm dlx clerk@latest env pull --instance prod --print
   ```
   It prints two `KEY=value` lines. `[V]`
4. Open `.env.production.local` (git-ignored) in your editor. Paste the two lines as they are. Save. Clear the terminal.
5. The agent pushes them, names only, after a dry run and the person's yes:
   ```bash
   node .agents/skills/secrets/scripts/push-secrets.mjs --dry-run --wrangler --env production
   ```
6. Turn on **Allowed subdomains**: https://dashboard.clerk.com/~/domains → **Allowed subdomains** tab → **Enable allowed subdomains**, add only the subdomains the app uses. `[V]`

Mobile app in production: also enable the **Native API** on https://dashboard.clerk.com/~/native-applications with the production instance selected, or calls fail with `native_api_disabled`. `[V]`

When it worked: the production site's sign-in shows your domain, not `accounts.dev`, and keys start with `pk_live_` and `sk_live_`.

## Free tier

A development instance is capped at 100 users and shows a "Development" banner. Paid features work in development, but production asks you to upgrade if you use them. `[V]` For today's free limits in production, see https://clerk.com/pricing (`[U]`, not read here).

## Why / if it goes wrong

- **Why the person runs `--print`:** a plain `env pull --instance prod` writes production keys over your development keys. `--print` touches no file, and running it in your own terminal keeps the values out of the agent's chat log. The secrets script then sends each value to GitHub and Cloudflare on stdin and prints names only.
- **`VITE_CLERK_PUBLISHABLE_KEY is missing`** in the Worker log: the file or the Worker has `CLERK_SECRET_KEY` but no publishable key under either name. Run step 3 again.
- **`env_name_deprecated` in the Worker log:** an environment still has the old `CLERK_PUBLISHABLE_KEY`. It works. Set `VITE_CLERK_PUBLISHABLE_KEY` with the same value (`pnpm connect clerk --force`, or step 3 and the secrets script), then remove the old one (`npx wrangler secret delete CLERK_PUBLISHABLE_KEY --env <env>`, after the person's yes).
- **Two apps by mistake:** someone ran `clerk init`. Pick one app; don't switch without the person's yes.
- **Users don't copy** from development to production. Production starts empty. `[V]`
- **Social logins:** development uses Clerk's shared OAuth credentials. Production needs your own for each provider. `[V]`
- **Which sites may use a sign-in (`authorizedParties`):** the TanStack Start pack sets it for you from `SITE_URL`, localhost and the test Worker's preview URLs, so there is no extra step. If the app also runs on another domain (a custom test domain, a second production domain), add it to `CLERK_AUTHORIZED_PARTIES` in that environment's `vars` in `wrangler.jsonc`: exact origins like `https://www.example.com`, comma-separated, no `*`. Production with Clerk keys won't start until `SITE_URL` (a GitHub variable on the `production` environment) or `CLERK_AUTHORIZED_PARTIES` is set. `[V]` in the pack's code and tests; `[U]` against a real Clerk instance.
- **A mobile app (the monorepo-expo pack):** its tokens carry no origin, so `CLERK_ALLOW_NATIVE_TOKENS` is `"true"` in `apps/web/wrangler.jsonc` for every environment (the pack's setup does it), and such a token must also carry an `app` claim equal to `CLERK_NATIVE_APP_CLAIM` there. The person adds that claim in Clerk (below). Clerk's custom session claims are per instance: every token the instance issues carries them, so the claim can't tell two apps on one instance apart. Use one Clerk application per product: another app's mobile users on the same Clerk instance could otherwise call this app's API. The claim makes native sign-in a setting on both sides that fails closed: no claim, a different value, or no `CLERK_NATIVE_APP_CLAIM` is the same 401 as no token. `[V]` in the pack's tests and Clerk's docs; `[U]` with a real phone and a real instance.

  ```text
  Setup step for you · Add the app claim to Clerk's token · about 3 minutes

  1. Open https://dashboard.clerk.com/~/sessions with the development instance selected.
  2. Under "Customize session token", in the Claims editor, add this line inside the braces,
     keeping any claims already there (a comma between them):
     "app": "<the CLERK_NATIVE_APP_CLAIM value from apps/web/wrangler.jsonc>"
  3. Click Save.
  4. Switch to the production instance (the menu at the top) and do steps 1 to 3 again.

  When it worked: signed in on the phone, the app's API calls succeed instead of "Sign in to continue".
  Stuck? Clerk refreshes a token every 60 seconds: sign out and in again, or wait a minute.
  ```

  An agent can do it with Clerk's CLI instead, after the person's yes, per instance: `npx clerk@latest config pull --keys session` to see the claims there now, then `npx clerk@latest config patch --json '{"session":{"claims":{"app":"<value>"}}}'` with every claim already there included in `claims`. `[V]` the command in Clerk's docs; `[U]` whether patch merges or replaces the claims, so keep them all.
- **Signed in on the site but every request says "Sign in to continue":** the site's address isn't in the list. The Worker log says `clerk_token_refused` (wrong origin) or `clerk_no_authorized_party` (no origin at all). Add the exact origin to `CLERK_AUTHORIZED_PARTIES`.
