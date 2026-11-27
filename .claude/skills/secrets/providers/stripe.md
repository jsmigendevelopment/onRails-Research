# Stripe (stripe add-on)

Last checked: 2026-11-26. Official docs:
- https://docs.stripe.com/keys
- https://docs.stripe.com/keys/restricted-api-keys
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/products-prices/manage-prices
- https://docs.stripe.com/customer-management/activate-no-code-customer-portal
- https://docs.stripe.com/cli
- the Stripe CLI's README in `stripe/stripe-cli` (commit of 2026-11-21)

How: the docs above were read on 2026-11-26. dashboard.stripe.com was not opened, so the steps match Stripe's docs, not a real account's screens. `[V]` = matches those docs, the CLI README or the add-on's tested code. `[U]` = not verified.

**What it's for.** Subscriptions. Fills:

```text
STRIPE_SECRET_KEY        sk_test_... (secret)
STRIPE_WEBHOOK_SECRET    whsec_...   (secret)
STRIPE_PRICE_ID          price_...   (not secret)
STRIPE_ALLOW_LIVE        only "true", only in production, only set by the person
```

**Test vs live.** Local, test and previews use test keys (`sk_test_` or `rk_test_`). The add-on refuses a live key (`sk_live_`) unless `STRIPE_ALLOW_LIVE=true`. `[V]` (`stripeKeyAllowed` in the add-on). Live keys, the live webhook and `STRIPE_ALLOW_LIVE` are the person's own production step, after launch.

**For `pnpm connect`.** The block below tells the script which names this file fills, where each one goes and which page to open. The steps stay in the sections below; the script prints them short. Format: the `secrets` skill.

```json connect
{
  "title": "Stripe",
  "order": 40,
  "url": "https://dashboard.stripe.com/test/apikeys",
  "steps": "## Walkthrough",
  "vars": {
    "STRIPE_SECRET_KEY": {"secret": true, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"], "shape": {"prefix": ["sk_test_", "rk_test_", "sk_live_", "rk_live_"]}},
    "STRIPE_WEBHOOK_SECRET": {"secret": true, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"], "split": true, "url": "https://dashboard.stripe.com/test/webhooks", "shape": {"prefix": ["whsec_"]}},
    "STRIPE_PRICE_ID": {"secret": false, "scope": ["local", "test", "production"], "to": [".env.local", "wrangler"], "url": "https://dashboard.stripe.com/test/products", "shape": {"prefix": ["price_"]}}
  }
}
```

## Make each key

For an agent driving the browser once the person has signed in (`secrets`, "Keys on Full"). Open the page and fill in what the row says. The button that makes or shows a secret value, and any code after it, are the person's. `[V]` = checked against Stripe's docs on 2026-11-26. Always a sandbox (test mode), never live: live keys are the person's production step.

| Variable | Open | Pick |
|---|---|---|
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/test/apikeys | **Create restricted key** (Stripe recommends one over a secret key). Name: `<app> test`. **Write** on **Customers**, **Checkout Sessions** and **Customer portal**; every other resource **None**. Stop there: the person presses **Create key** and enters the two-factor code Stripe sends them in the dialog. The key starts `rk_test_`. `[V]` steps, `[U]` the resource names, not tried on a real account. |
| `STRIPE_WEBHOOK_SECRET` | https://dashboard.stripe.com/test/webhooks | For the test site. **Create an event destination**, **Your account**, payload **Snapshot**, the five `customer.subscription.*` events from the walkthrough, **Continue**, **Webhook endpoint**, the URL `https://<test host>/api/stripe/webhook`. On its page, **Reveal secret** shows the `whsec_` value: that click is the person's. Stop there: the person presses **Reveal secret**. Local dev uses `stripe listen` instead (walkthrough step 6). `[V]` |
| `STRIPE_PRICE_ID` | https://dashboard.stripe.com/test/products | **+ Add product**: a name and a **Recurring** price. The price id (`price_...`) is on the product's page. Not secret. `[V]` |

## Walkthrough, test mode · about 10 minutes

1. Make an account and stay in test mode (or a sandbox). Open the API keys page: https://dashboard.stripe.com/test/apikeys. Make a **restricted key** (the table above), or a **Secret key**: **Create secret key**, the code Stripe emails or texts you, a name, **Create**. Paste it into `.env.local` and `.env.test.local` as `STRIPE_SECRET_KEY`. Never into chat. `[V]`
2. Sign in the Stripe CLI, in your own terminal: `[V]`
   ```bash
   pnpm dlx @stripe/cli@1.55.14 login
   ```
3. Make the product and price: https://dashboard.stripe.com/test/products → add a product with a **recurring** price. Copy the price id (`price_...`) into `STRIPE_PRICE_ID`. `[V]`
4. Turn on the customer portal: https://dashboard.stripe.com/test/settings/billing/portal. `[V]` (the docs link the live page; `/test/` is the sandbox one, `[U]`)
5. Webhook for the **test site**: https://dashboard.stripe.com/test/webhooks → **Create an event destination**, **Webhook endpoint**. URL: `[V]`
   ```text
   https://<test host>/api/stripe/webhook
   ```
   Events: `[V]` (the add-on handles these)
   ```text
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   customer.subscription.paused
   customer.subscription.resumed
   ```
   Copy its **Signing secret** (`whsec_...`) into `.env.test.local` as `STRIPE_WEBHOOK_SECRET`.
6. Webhook for **local dev**: the CLI prints its own `whsec_` for `.env.local`: `[V]` (the add-on's notes)
   ```bash
   pnpm dlx @stripe/cli@1.55.14 listen --forward-to localhost:3000/api/stripe/webhook
   ```
7. The agent pushes the test values, names only: `node .agents/skills/secrets/scripts/push-secrets.mjs --dry-run --wrangler --env test`.

When it worked: on `/billing`, Subscribe and pay with card `4242 4242 4242 4242`. The page shows Active. `[V]` (the add-on's notes)

## Free tier

No setup or monthly fee; Stripe charges per payment. Test mode is free. `[V]`, see https://stripe.com/pricing.

## Why / if it goes wrong

- **Webhook 400:** the signing secret is for a different endpoint. Each endpoint, and each `stripe listen`, has its own `whsec_`.
- **Webhook can't reach the test site behind Cloudflare Access or the password page:** add `/api/stripe/webhook` to `OPEN_PATHS` and to the Access app's public paths (the add-on's step 8).
- **"Billing isn't set up yet":** one of the three values is empty, or a live key was used without `STRIPE_ALLOW_LIVE`.
- **Stripe's agent tools** (`stripe agent setup`, its plugin and MCP server, the implementation planner): [`../setup/stripe.md`](../setup/stripe.md).
- Stripe's dashboard moves often (sandboxes, Workbench). If a link above lands somewhere else, follow Stripe's current docs at https://docs.stripe.com/keys and tell the agent so it opens an issue to fix this file.
