# Google sign-in for Cloudflare Access

Last checked: 2026-11-23. Official docs:
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/

How: read from Cloudflare's public docs repo (`cloudflare/cloudflare-docs`, commit of 2026-11-22). Google's own help pages (console.cloud.google.com, support.google.com, developers.google.com) were blocked here and have no public docs repo, so the Google Console steps are as Cloudflare documents them. `[V]` = matches that source. `[U]` = not checked.

**What it's for.** A "Sign in with Google" button on the Cloudflare Access page in front of the test site. Any Google account can sign in, if the Access policy allows its email. Fills, in `.env.cloudflare.local` (git-ignored, read only by setup-cloudflare):

```text
ACCESS_GOOGLE_CLIENT_ID=
ACCESS_GOOGLE_CLIENT_SECRET=
```

You need your **team domain** first: `<team>.cloudflareaccess.com`. setup-cloudflare prints it, or see **Zero Trust → Settings → Team name and domain**. `[V]`

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Google sign-in for Cloudflare Access",
  "order": 60,
  "url": "https://console.cloud.google.com/auth/clients",
  "steps": "## Walkthrough",
  "vars": {
    "ACCESS_GOOGLE_CLIENT_ID": {"secret": false, "scope": ["local"], "to": [".env.cloudflare.local"]},
    "ACCESS_GOOGLE_CLIENT_SECRET": {"secret": true, "scope": ["local"], "to": [".env.cloudflare.local"]}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Google's and Cloudflare's docs on 2026-11-26.

| Variable | Open | Pick |
|---|---|---|
| `ACCESS_GOOGLE_CLIENT_ID`, `ACCESS_GOOGLE_CLIENT_SECRET` | https://console.cloud.google.com/auth/clients | A project and a consent screen first (walkthrough steps 1 and 2). **Create client**, **Application type:** Web application. **Authorized JavaScript origins:** `https://<team>.cloudflareaccess.com`. **Authorized redirect URIs:** `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`. No scopes to pick here: Access asks for the email at sign-in. Stop there: the person presses **Create**. The secret shows when the client is made. `[V]` |

## Walkthrough · about 5 minutes

1. Make a project: https://console.cloud.google.com/projectcreate. Any name. Click **Create**. `[V]` (Cloudflare: "Create a new project ... select Create")
2. Set up the consent screen: https://console.cloud.google.com/auth/overview → **Get started**. Enter an **App name** and **User support email**. Audience: **External**. Enter your contact email, agree, **Continue**, **Create**. `[V]` steps, `[U]` the deep link.
3. Make the client: https://console.cloud.google.com/auth/clients → **Create client**. **Application type:** Web application. Any name. `[V]` steps, `[U]` the deep link.
4. Under **Authorized JavaScript origins → URIs**, paste: `[V]`
   ```text
   https://<team>.cloudflareaccess.com
   ```
   Under **Authorized redirect URIs → URIs**, paste: `[V]`
   ```text
   https://<team>.cloudflareaccess.com/cdn-cgi/access/callback
   ```
   Click **Create**.
5. Copy the **Client ID** and **Client secret** right away. Open `.env.cloudflare.local` in your editor and paste them after the names above. Never into chat. `[V]`
6. Tell the agent you're done. It runs setup-cloudflare again.

When it worked: setup-cloudflare says `exists  Google login`. In **Zero Trust → Integrations → Identity providers**, **Test** next to Google signs you in. `[V]`

## Free tier

Free. No Google Workspace needed. `[V]`

## Why / if it goes wrong

- **`redirect_uri_mismatch`:** the callback URL isn't exact. It must be `https://`, your team name, and end in `/cdn-cgi/access/callback`. No trailing slash.
- **`Error 401: deleted_client`:** the client was deleted in Google. Make a new one and update both values. `[V]`
- **Can't see the secret later:** Google may show it only when it's made. If it's gone, add a new secret to the client and update the file. `[U]`, from memory of Google's 2025 change, not checked.
- **"This app isn't verified" or a test-users limit:** a consent screen in **Testing** limits who can sign in. Publish the app in the consent screen's audience settings if strangers can't get in. `[U]`, Cloudflare's doc doesn't cover it.
- The Google Workspace login is a different provider (it reads groups). This file is the plain Google one.
