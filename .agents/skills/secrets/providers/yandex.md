# Yandex sign-in for Cloudflare Access

Last checked: 2026-11-23. Official docs:
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/yandex/

How: read from Cloudflare's public docs repo (`cloudflare/cloudflare-docs`, commit of 2026-11-22). Yandex's own docs (yandex.com/dev/id) were blocked here and have no public docs repo. Cloudflare's page uses older Yandex names (for example "Yandex.Passport API" and "Callback URL #1"); Yandex's screen may say "Yandex ID API" and "Redirect URI" now. Both are given. `[V]` = matches Cloudflare's page. `[U]` = not checked.

**What it's for.** A "Sign in with Yandex" button on the Access page. Fills, in `.env.cloudflare.local` (git-ignored):

```text
ACCESS_YANDEX_CLIENT_ID=
ACCESS_YANDEX_CLIENT_SECRET=
```

You need your **team domain**: `<team>.cloudflareaccess.com` (setup-cloudflare prints it).

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Yandex sign-in for Cloudflare Access",
  "order": 60,
  "url": "https://oauth.yandex.com/client/new",
  "steps": "## Walkthrough",
  "vars": {
    "ACCESS_YANDEX_CLIENT_ID": {"secret": false, "scope": ["local"], "to": [".env.cloudflare.local"]},
    "ACCESS_YANDEX_CLIENT_SECRET": {"secret": true, "scope": ["local"], "to": [".env.cloudflare.local"]}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Yandex's and Cloudflare's docs on 2026-11-26.

| Variable | Open | Pick |
|---|---|---|
| `ACCESS_YANDEX_CLIENT_ID`, `ACCESS_YANDEX_CLIENT_SECRET` | https://oauth.yandex.com/client/new | App type: for user login on your service (Yandex: the type can't change later). Under **Yandex ID API** (or **Yandex.Passport API**), tick **Access to email address**, **Access to user avatar** and **Access to username, first name and surname, gender**. Platform **Web services**, the callback URL in **Redirect URI** (or **Callback URL #1**). Stop there: the person presses **Create app**. The app's page shows the ClientID and the Client secret. `[V]` steps, `[U]` the deep link. |

## Walkthrough · about 5 minutes

1. Sign in to Yandex and open https://oauth.yandex.com/client/new (Cloudflare: **Open a new OAuth Application → New client**). Fill in the required fields. `[V]` steps, `[U]` the deep link.
2. Under **Yandex.Passport API** (or **Yandex ID API**), tick **Access to email address**, **Access to user avatar** and **Access to username, first name and surname, gender**. `[V]`
3. Platform: **Web services**. In **Callback URL #1** (or **Redirect URI**), paste: `[V]`
   ```text
   https://<team>.cloudflareaccess.com/cdn-cgi/access/callback
   ```
4. Click **Add**, then **Submit** (or **Create app**). `[V]`
5. Copy the **ID** (ClientID) into `ACCESS_YANDEX_CLIENT_ID` and the **Password** (Client secret) into `ACCESS_YANDEX_CLIENT_SECRET`, in `.env.cloudflare.local`. Never into chat. `[V]`

When it worked: setup-cloudflare says `exists  Yandex login`, and **Test** in **Zero Trust → Integrations → Identity providers** signs you in.

## Free tier

Free. `[U]`

## Why / if it goes wrong

- **No email in the sign-in:** the email scope in step 2 wasn't ticked. Access needs the email to match a policy.
- **Redirect error:** the callback URL isn't exact.
- If Yandex's screen differs from both names above, follow Yandex's screen and tell the agent so it opens an issue to fix this file.
