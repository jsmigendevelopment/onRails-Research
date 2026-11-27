# LinkedIn sign-in for Cloudflare Access

Last checked: 2026-11-23. Official docs:
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/linkedin/

How: read from Cloudflare's public docs repo (`cloudflare/cloudflare-docs`, commit of 2026-11-22). LinkedIn's own docs (learn.microsoft.com/linkedin) were blocked here and their docs repo wasn't reachable, so the LinkedIn steps are as Cloudflare documents them. `[V]` = matches that source. `[U]` = not checked.

**What it's for.** A "Sign in with LinkedIn" button on the Access page. Fills, in `.env.cloudflare.local` (git-ignored):

```text
ACCESS_LINKEDIN_CLIENT_ID=
ACCESS_LINKEDIN_CLIENT_SECRET=
```

You need your **team domain**: `<team>.cloudflareaccess.com` (setup-cloudflare prints it). You also need a **LinkedIn Page** (a company page) and a logo image.

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "LinkedIn sign-in for Cloudflare Access",
  "order": 60,
  "url": "https://www.linkedin.com/developers/apps/new",
  "steps": "## Walkthrough",
  "vars": {
    "ACCESS_LINKEDIN_CLIENT_ID": {"secret": false, "scope": ["local"], "to": [".env.cloudflare.local"]},
    "ACCESS_LINKEDIN_CLIENT_SECRET": {"secret": true, "scope": ["local"], "to": [".env.cloudflare.local"]}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against LinkedIn's and Cloudflare's docs on 2026-11-26. It needs a **LinkedIn Page** and a logo.

| Variable | Open | Pick |
|---|---|---|
| `ACCESS_LINKEDIN_CLIENT_ID`, `ACCESS_LINKEDIN_CLIENT_SECRET` | https://www.linkedin.com/developers/apps/new | **App name**, the **LinkedIn Page**, **Upload a logo**, the **API Terms of Use**, **Create app**. **Products** → **Request Access** next to **Sign In with LinkedIn using OpenID Connect** (its scopes: `openid`, `profile`, `email`). **Auth** → **OAuth 2.0 settings**: add the callback URL. The **Client ID** is on **Auth**, and the **Client Secret** is hidden there. Stop there: the person presses **Show** (the eye) next to it. `[V]` steps, `[U]` the deep link and the button name. |

## Walkthrough · about 10 minutes

1. Open https://www.linkedin.com/developers/apps/new. Enter an **App name**, pick a **LinkedIn Page** (or **Create a new LinkedIn page**), **Upload a logo**, agree to the **API Terms of Use**, then **Create app**. `[V]` steps, `[U]` the deep link.
2. **Products** tab: click **Request Access** next to **Sign In with LinkedIn using OpenID Connect**. `[V]`
3. **Auth** tab → **OAuth 2.0 settings**: click the pencil next to **Authorized redirect URLs for your app** and add: `[V]`
   ```text
   https://<team>.cloudflareaccess.com/cdn-cgi/access/callback
   ```
4. **Auth** tab: copy the **Client ID** and **Client Secret** into `.env.cloudflare.local`. Never into chat. `[V]`

When it worked: setup-cloudflare says `exists  LinkedIn login`, and **Test** in **Zero Trust → Integrations → Identity providers** signs you in. `[V]`

## Free tier

Free. `[U]`, not checked on LinkedIn's site.

## Why / if it goes wrong

- **No LinkedIn Page:** the app can't be made without one. Make a page first.
- **Sign-in fails with a scope error:** the OpenID Connect product wasn't granted yet. Check the **Products** tab.
- **Redirect error:** the URL in step 3 isn't exact.
