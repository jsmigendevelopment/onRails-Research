# Preset: SaaS

**For:** software people sign up for and pay for.

## Preloaded (confirm, don't ask)

- **Add-ons:** Clerk auth, Stripe (subscriptions with Checkout and the customer portal), Resend email, Sentry, Cloudflare Web Analytics.
- **Floor answers:**
  - sign-up with email or Google through Clerk;
  - password reset through Clerk;
  - people can delete their account and their data;
  - billing through the Stripe portal;
  - a cookie-free analytics setup;
  - WCAG 2.2 AA.
- **Slices that almost every SaaS needs:** sign-up and sign-in, the core feature, plans and checkout, settings and account deletion.
- **Risk:** billing, auth and personal data are the risky lane.

## Still ask

- The pricing model: free tier, trial, per seat or flat. Ask this open first, because it's money.
- Teams or solo accounts (organisations in Clerk change the data model).
- What the free tier can and can't do.
- Which emails go out (welcome, receipts, usage alerts).
