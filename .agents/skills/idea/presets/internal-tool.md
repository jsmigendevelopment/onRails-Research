# Preset: Internal tool

**For:** a tool used by one team or company.

## Preloaded (confirm, don't ask)

- **Add-ons:** Clerk auth (restricted to the company's email domain or an invite list), Sentry.
- **Floor answers:**
  - no public sign-up;
  - roles (admin and member at least);
  - an audit trail of who changed what;
  - no billing;
  - search engines blocked (noindex);
  - Cloudflare Access in front of all of production, as well as test and previews: sign in with Google (or the company's work login) or a one-time PIN, allowed by the company's email domain. With the TanStack Start pack: `setup-cloudflare --protect access --protect-production all --logins google --allow-domain <company.com>`. Production is on the always-stop list: dry run, the person's yes, then the real run with `--production-ok`. Clerk still signs people in to the app behind it;
  - WCAG 2.2 AA.
- **Common slices:** sign-in, a data table with filters, a detail and edit view, roles and invites, an export.
- **Risk:** access control is the risky lane. Every query is scoped to the signed-in user's organisation.

## Still ask

- Who's allowed in, and how they get access: the company's email domain, a list of emails, or a GitHub org. Which login (Google is the default; Microsoft Entra or another work login if the company uses one).
- What data it reads or writes, and whether it already exists somewhere (an import, or an existing API).
- Which actions need an approval or an undo.
