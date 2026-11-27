# Supabase (database-supabase add-on)

Last checked: 2026-11-23. Official docs:
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/ai-tools/ai-skills
- https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/

How: both docs sites were blocked here, so these were read from the public repos (`supabase/supabase`, commit of 2026-11-23; `cloudflare/cloudflare-docs`, commit of 2026-11-22). `[V]` = matches those sources. `[U]` = not checked.

**What it's for.** A Postgres database reached through Cloudflare Hyperdrive. The app needs no Supabase key at runtime: the Worker uses the `HYPERDRIVE` binding. One secret, only in your shell when you migrate:

```text
DATABASE_URL   secret; never in the Worker, never in a file the agent opens
```

Test and production are two Supabase projects and two Hyperdrive configs.

**No `pnpm connect` block, on purpose.** `DATABASE_URL` lives only in your shell for a migration, and the Hyperdrive id isn't secret, so there's nothing for the script to store.

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Supabase's docs on 2026-11-26.

| Variable | Open | Pick |
|---|---|---|
| `DATABASE_URL` | https://supabase.com/dashboard/project/_?showConnect=true&method=session | Pick the test project; production is the person's go-ahead first. The **Connect** dialog opens on **Session pooler**: the string holds `[YOUR-PASSWORD]`, which the person fills in, in their own terminal (walkthrough step 3). No project yet? https://supabase.com/dashboard/new: fill in the name and region, and leave **Database password** to the person, since it's a secret. A third project needs a paid plan: a 🛑. `[V]` the Connect link, `[U]` the new-project link. |

## Walkthrough · about 10 minutes per environment

1. Create a project: https://supabase.com/dashboard/new (or **New project** on https://supabase.com/dashboard). Save the database password in your password manager; the dashboard won't show it again. `[V]` (create), `[U]` (the deep link).
2. Open the project, click **Connect** at the top, choose **Session pooler**, copy the string, and put your password in place of `[YOUR-DATABASE-PASSWORD]`. Percent-encode `&`, `#`, `?` or spaces in it. `[V]`
   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-DATABASE-PASSWORD]@[POOLER-HOST]:5432/postgres
   ```
3. Make the Hyperdrive config, in your own terminal (the string never goes in chat or in a file the agent reads): `[V]` (the add-on's notes)
   ```bash
   pnpm exec wrangler hyperdrive create app-db-test --connection-string="<the string>"
   ```
   Give the agent the **id** it prints (not secret). It goes in `wrangler.jsonc`.
4. Migrate once, in your own terminal:
   ```bash
   DATABASE_URL="<the string>" pnpm db:migrate
   ```
5. Repeat 1 to 4 for production, with its own project and `app-db-production`. Production is on the always-stop list: the person runs it.

When it worked: `pnpm exec wrangler hyperdrive list` shows the config, and the deployed app's notes page loads data.

## Supabase CLI and agent skills

- Local dev: `supabase start` (Docker) serves Postgres on `127.0.0.1:54322`, which the add-on's `localConnectionString` expects. `[V]` (the add-on's notes)
- Supabase publishes agent skills, a plugin and an MCP server. Installing the CLI and offering them: [`../setup/supabase.md`](../setup/supabase.md). Install only on a yes.

## Free tier

Two free projects across the orgs you own or admin. Paused projects don't count. `[V]` Free projects can pause when idle; check the billing page above for today's rule (`[U]`).

## Why / if it goes wrong

- **Session pooler, port 5432, not the transaction pooler on 6543.** Hyperdrive pools on its own. Cloudflare's Supabase page says to use the "Direct connection" string instead, but on Supabase's free plan that one is IPv6 only, while the session pooler is IPv4. `[V]` both facts. The add-on picked the session pooler; if it fails to connect, try the direct string and tell the agent.
- **Password with `@` or `#` fails to connect:** percent-encode it. `[V]`
- **Forgot the password:** **Reset database password** in the Connect dialog. It breaks connections that use the old one, so update Hyperdrive too. `[V]`
- **Test and production share a project:** don't. A bad migration on test would hit real data.
