# Microsoft Entra ID sign-in for Cloudflare Access

Last checked: 2026-11-23. Official docs:
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/entra-id/
- https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri
- https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials

How: both docs sites were blocked here, so these were read from the public docs repos (`cloudflare/cloudflare-docs`, commit of 2026-11-22; `MicrosoftDocs/entra-docs`, commit of 2026-11-22). `[V]` = matches those sources. `[U]` = not checked.

**What it's for.** Work accounts (Microsoft 365) on the Access page. Fills, in `.env.cloudflare.local` (git-ignored):

```text
ACCESS_ENTRA_CLIENT_ID=
ACCESS_ENTRA_CLIENT_SECRET=
ACCESS_ENTRA_TENANT_ID=
```

You need your **team domain**: `<team>.cloudflareaccess.com` (setup-cloudflare prints it), and at least the **Application Developer** role in your tenant. `[V]`

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Microsoft Entra ID sign-in for Cloudflare Access",
  "order": 60,
  "url": "https://entra.microsoft.com",
  "steps": "## Walkthrough",
  "vars": {
    "ACCESS_ENTRA_CLIENT_ID": {"secret": false, "scope": ["local"], "to": [".env.cloudflare.local"]},
    "ACCESS_ENTRA_CLIENT_SECRET": {"secret": true, "scope": ["local"], "to": [".env.cloudflare.local"]},
    "ACCESS_ENTRA_TENANT_ID": {"secret": false, "scope": ["local"], "to": [".env.cloudflare.local"]}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Microsoft's and Cloudflare's docs on 2026-11-26. The person needs at least the **Application Developer** role, and an admin for the consent.

| Variable | Open | Pick |
|---|---|---|
| `ACCESS_ENTRA_CLIENT_ID`, `ACCESS_ENTRA_TENANT_ID` | https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade | **New registration**. A **Name**. **Supported account types:** **Single tenant only**. **Redirect URI:** **Web**, `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`. **Register**. Both IDs are on **Overview**, and neither is secret. `[V]` steps, `[U]` the deep link (else **Entra ID** → **App registrations**). |
| `ACCESS_ENTRA_CLIENT_SECRET` | https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade | The app, then **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**: `email`, `offline_access`, `openid`, `profile`, `User.Read`, **Add permissions**, **Grant admin consent**. Then **Certificates & secrets** → **Client secrets** → **New client secret**, a description and an expiry of 12 months or less (Microsoft's advice; 24 at most). Stop there: the person presses **Add**. The value shows once, and hides once they leave the page. `[V]` |

## Walkthrough · about 15 minutes

1. Open https://entra.microsoft.com → **Entra ID** → **App registrations** → **New registration**. Enter a **Name**. **Supported account types:** **Single tenant only**. **Redirect URI:** platform **Web**, then paste: `[V]`
   ```text
   https://<team>.cloudflareaccess.com/cdn-cgi/access/callback
   ```
   Click **Register**.
2. On **Overview**, copy the **Application (client) ID** and the **Directory (tenant) ID** into `.env.cloudflare.local`. `[V]`
3. **Certificates & secrets** → **Client secrets** → **New client secret**. Add a description and an expiry (24 months at most), **Add**. Copy its **Value** now: it's never shown again. Paste it as `ACCESS_ENTRA_CLIENT_SECRET`. `[V]`
4. **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**. Tick: `[V]`
   ```text
   email  offline_access  openid  profile  User.Read
   ```
   Click **Add permissions**, then **Grant admin consent**. `[V]`
5. Put the secret's expiry date in your calendar.

When it worked: setup-cloudflare says `exists  Microsoft Entra ID login`, and **Test** in **Zero Trust → Integrations → Identity providers** signs you in. `[V]`

## Free tier

App registrations are part of every Entra tenant. `[U]` for plan limits, not read here.

## Why / if it goes wrong

- **Sign-in stops one day:** the client secret expired. Make a new one (step 3), update the file, run setup-cloudflare. `[V]`
- **Groups:** Cloudflare's tested set also adds `Directory.Read.All` and `GroupMember.Read.All` so Access can read groups. setup-cloudflare doesn't use groups, so leave them out unless you need them. `[V]`
- **Copied the secret's ID, not its Value:** sign-in fails. The Value is the long one.
- **"Needs admin approval":** someone with admin rights must click **Grant admin consent**.
- Microsoft says client secrets are less safe than certificates for production. Access's setup here uses a secret; that's Cloudflare's documented way. `[V]`
