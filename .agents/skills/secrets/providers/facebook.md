# Facebook sign-in for Cloudflare Access

Last checked: 2026-11-23. Official docs:
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/facebook-login/

How: read from Cloudflare's public docs repo (`cloudflare/cloudflare-docs`, commit of 2026-11-22). Meta's own docs (developers.facebook.com) were blocked here and have no public docs repo, so the Meta steps are as Cloudflare documents them. `[V]` = matches that source. `[U]` = not checked.

**What it's for.** A "Sign in with Facebook" button on the Access page. Fills, in `.env.cloudflare.local` (git-ignored):

```text
ACCESS_FACEBOOK_CLIENT_ID=
ACCESS_FACEBOOK_CLIENT_SECRET=
```

You need your **team domain**: `<team>.cloudflareaccess.com` (setup-cloudflare prints it).

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Facebook sign-in for Cloudflare Access",
  "order": 60,
  "url": "https://developers.facebook.com/apps/creation/",
  "steps": "## Walkthrough",
  "vars": {
    "ACCESS_FACEBOOK_CLIENT_ID": {"secret": false, "scope": ["local"], "to": [".env.cloudflare.local"]},
    "ACCESS_FACEBOOK_CLIENT_SECRET": {"secret": true, "scope": ["local"], "to": [".env.cloudflare.local"]}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Meta's and Cloudflare's docs on 2026-11-26.

| Variable | Open | Pick |
|---|---|---|
| `ACCESS_FACEBOOK_CLIENT_ID`, `ACCESS_FACEBOOK_CLIENT_SECRET` | https://developers.facebook.com/apps/creation/ | **App name** and **App contact email**. Use case: **Authenticate and request data from users with Facebook Login**. **Create app**. Then walkthrough steps 4 and 5: **Use Strict Mode for redirect URIs** on, and the callback URL. No scopes to pick: Access asks for the email at sign-in. Open **App settings** → **Basic**: the **App ID** shows, the **App Secret** is hidden. Stop there: the person presses **Show** next to it, and enters their password if Facebook asks. `[V]` steps, `[U]` the button name. |

## Walkthrough · about 10 minutes

1. Open https://developers.facebook.com/apps/creation/ (make a developer account if asked). Enter the **App name** and **App contact email**, **Next**. `[V]` steps, `[U]` the deep link.
2. Use case: **Authenticate and request data from users with Facebook Login**. **Next** until **Overview**, then **Create app**. `[V]`
3. **App settings → Basic**: copy the **App ID** and **App Secret** into `.env.cloudflare.local` (App ID → `_CLIENT_ID`, App Secret → `_CLIENT_SECRET`). Never into chat. `[V]`
4. **My Apps** → your app → **Customize the Authenticate and request data from users with Facebook Login use case** → **Settings**. Set **Use Strict Mode for redirect URIs** to **Yes**. `[V]`
5. In **Valid OAuth Redirect URIs**, paste, then **Save Changes**: `[V]`
   ```text
   https://<team>.cloudflareaccess.com/cdn-cgi/access/callback
   ```

When it worked: setup-cloudflare says `exists  Facebook login`, and **Test** in **Zero Trust → Integrations → Identity providers** signs you in.

## Free tier

Free. `[U]`, not checked on Meta's site.

## Why / if it goes wrong

- **"URL blocked" or a redirect error:** the redirect URI isn't exact, or Strict Mode is on with a different URL.
- **Only you can sign in:** the Meta app may still be in development mode. Meta can ask for app review or business checks before it goes live. `[U]`, not covered by Cloudflare's doc.
- Meta changes this dashboard often. If a button name differs, follow Meta's current screen and tell the agent so it opens an issue to fix this file.
