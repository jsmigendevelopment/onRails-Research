# Expo and EAS (monorepo-expo pack)

Last checked: 2026-11-23. Official docs:
- https://docs.expo.dev/eas/environment-variables/manage/
- https://docs.expo.dev/accounts/programmatic-access/

How: docs.expo.dev was blocked here, so these were read from Expo's public repo (`expo/expo`, `docs/pages`, commit of 2026-11-22). `[V]` = matches that source. `[U]` = not checked.

**What it's for.** Building and updating the mobile app on Expo's servers (EAS). The app reads two public values, compiled into the bundle:

```text
EXPO_PUBLIC_API_URL                 the web app's test or production URL
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY   the same Clerk key as the web app (see clerk.md)
```

`EXPO_PUBLIC_*` values are never secrets: anyone with the app can read them.

**No token is needed today.** Nothing in the pack runs `eas` for you, so `EXPO_TOKEN` isn't used. You need one only to run `eas` somewhere you can't sign in. `[V]` (the pack has no EAS step)

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Expo",
  "order": 45,
  "url": "https://expo.dev/",
  "steps": "## Walkthrough",
  "vars": {
    "EXPO_PUBLIC_API_URL": {"secret": false, "scope": ["local"], "to": ["apps/mobile/.env"], "shape": {"prefix": ["http://", "https://"]}},
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": {"secret": false, "scope": ["local"], "to": ["apps/mobile/.env"], "shape": {"prefix": ["pk_test_", "pk_live_"]}},
    "E2E_API_URL": {"secret": false, "scope": ["test"], "to": ["github-repo"], "shape": {"prefix": ["https://"]}},
    "E2E_CLERK_PUBLISHABLE_KEY": {"secret": false, "scope": ["test"], "to": ["github-repo"], "shape": {"prefix": ["pk_test_"]}}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Expo's, Clerk's and Cloudflare's docs on 2026-11-26. All four are public values: nothing to make.

| Variable | Open | Pick |
|---|---|---|
| `EXPO_PUBLIC_API_URL`, `E2E_API_URL` | https://dash.cloudflare.com/?to=/:account/workers-and-pages | The test Worker's address (its `workers.dev` URL, or its custom domain under **Settings** → **Domains & Routes**), with `https://`. `[V]` |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `E2E_CLERK_PUBLISHABLE_KEY` | https://dashboard.clerk.com/~/api-keys | The **Development** instance's publishable key (`pk_test_`), the same as the web app's. `[V]` |
| `EXPO_TOKEN` | https://expo.dev/settings/access-tokens | Only if `eas` runs later where nobody is signed in (a server; never GitHub Actions). **Create token**, a name (`<app> builds`), turn on **Limit access**. Stop there: the person presses **Create** in the dialog. Shown once. `[V]` page and **Limit access**, `[U]` button names. |

## Walkthrough · about 10 minutes

1. Make an Expo account: https://expo.dev/signup (`[U]` link). Then, in `apps/mobile`, in your own terminal:
   ```bash
   npx eas-cli@27.11.0 login
   npx eas-cli@27.11.0 init
   npx eas-cli@27.11.0 update:configure
   ```
   `init` writes the project ID into `app.json`. These need your Expo account: an agent never runs them.
2. Set the two values per EAS environment, as plain text: `[V]`
   ```bash
   npx eas-cli@27.11.0 env:set --name EXPO_PUBLIC_API_URL --value https://<test URL> --environment preview --visibility plaintext
   npx eas-cli@27.11.0 env:set --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_test_... --environment preview --visibility plaintext
   ```
   Again with `--environment production` and the production values.
3. Check: `npx eas-cli@27.11.0 env:list --environment preview`. `[V]`
4. For local dev, put the same two lines in `apps/mobile/.env` (git-ignored).
5. Only on `ci = "actions"`, for the Maestro tests in GitHub, set repository variables (public, so variables, not secrets):
   ```bash
   gh variable set E2E_API_URL
   gh variable set E2E_CLERK_PUBLISHABLE_KEY
   ```

Only if `eas` runs later where nobody is signed in (a server; never GitHub Actions): make a token at https://expo.dev/settings/access-tokens, turn on **Limit access**, and keep it in that machine's shell. On `ci = "actions"` only, store it with `gh secret set EXPO_TOKEN --env <env>`. `[V]`

When it worked: `eas build --profile preview` finishes, and the installed app shows sign-in and reaches the test API.

## Free tier

EAS has a free plan with a monthly build allowance. `[U]`, see https://expo.dev/pricing.

## Why / if it goes wrong

- **`EAS project not configured`:** `init` wasn't run, so `extra.eas.projectId` is missing. `[V]`
- **A secret in `EXPO_PUBLIC_*`:** it ships in the app. Never do it.
- **Visibility:** EAS has plain text, sensitive and secret. Use secret only for values the build needs but nobody should read. These two are plain text. `[V]`
- **`env:set`, not `env:create` or `env:update`.** In eas-cli 27.11.0 `env:set` creates or updates a variable; the other two still run but are deprecated. `[V]` (the package's `oclif.manifest.json`)
- **Clerk production on mobile:** enable the Native API (see `clerk.md`).
