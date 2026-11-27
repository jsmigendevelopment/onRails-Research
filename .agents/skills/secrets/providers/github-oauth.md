# GitHub sign-in for Cloudflare Access

Last checked: 2026-11-23. Official docs:
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/github/
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

How: read from the public docs repos (`cloudflare/cloudflare-docs`, commit of 2026-11-22; `github/docs`, commit of 2026-11-20). `[V]` = matches that source. `[U]` = not checked.

**What it's for.** A "Sign in with GitHub" button on the Access page. It can also allow a whole GitHub org (`--allow-github-org`). Fills, in `.env.cloudflare.local` (git-ignored):

```text
ACCESS_GITHUB_CLIENT_ID=
ACCESS_GITHUB_CLIENT_SECRET=
```

You need your **team domain**: `<team>.cloudflareaccess.com` (setup-cloudflare prints it).

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "GitHub sign-in for Cloudflare Access",
  "order": 60,
  "url": "https://github.com/settings/applications/new",
  "steps": "## Walkthrough",
  "vars": {
    "ACCESS_GITHUB_CLIENT_ID": {"secret": false, "scope": ["local"], "to": [".env.cloudflare.local"]},
    "ACCESS_GITHUB_CLIENT_SECRET": {"secret": true, "scope": ["local"], "to": [".env.cloudflare.local"]}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against GitHub's and Cloudflare's docs on 2026-11-26.

| Variable | Open | Pick |
|---|---|---|
| `ACCESS_GITHUB_CLIENT_ID`, `ACCESS_GITHUB_CLIENT_SECRET` | https://github.com/settings/applications/new | An **OAuth app**. **Application name:** the app's. **Homepage URL:** `https://<team>.cloudflareaccess.com`. **Authorization callback URL:** `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`. Leave **Enable Device Flow** off. No scopes here: Access asks for orgs, teams and email when the person clicks **Authorize** (walkthrough step 5). **Register application** (it shows only the client ID). Stop there: the person presses **Generate a new client secret** (shown once). `[V]` |

## Walkthrough · about 3 minutes

1. Open https://github.com/settings/applications/new. This is an **OAuth app**, not a GitHub App. (Same page: profile picture → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.) `[V]`
2. **Application name:** your app's name. **Homepage URL:** `[V]`
   ```text
   https://<team>.cloudflareaccess.com
   ```
   **Authorization callback URL:** `[V]`
   ```text
   https://<team>.cloudflareaccess.com/cdn-cgi/access/callback
   ```
3. Click **Register application**. Copy the **Client ID**. Click **Generate a new client secret** and copy it. `[V]`
4. Paste both into `.env.cloudflare.local` after the names above. Never into chat.
5. After the agent runs setup-cloudflare: open **Zero Trust → Integrations → Identity providers → GitHub**, click **Finish setup**, then **Authorize**. It asks to read orgs and teams, and email addresses. `[V]`

When it worked: setup-cloudflare says `exists  GitHub login`, and **Test** next to GitHub in Zero Trust signs you in. `[V]`

## Free tier

Free on every GitHub plan.

## Why / if it goes wrong

- **Org policy blocks someone who just joined the org:** they must revoke the app in their GitHub settings, then sign in again. `[V]`
- **Two-factor on GitHub:** sign in to GitHub first, then come back to Access. `[V]`
- **Leave "Enable Device Flow" off.** Access doesn't need it.
- The secret is shown once. Lost it? Generate a new one and update the file.
