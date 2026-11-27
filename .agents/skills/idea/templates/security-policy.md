# Security policy

The security reviewer reads this before every risky change. Keep it short and true.

## What's sensitive here

| Data or asset | Why it matters | Who may see or change it |
|---|---|---|
|  |  |  |

## Trust boundaries

Where untrusted input comes in: forms, API routes, webhooks, uploads, third-party calls.

- 

## Who can do what

- **Model:** owner only ("a user owns their own rows") / relationship-based (ReBAC)
- Asked in the tech grill: *"Will people share things, have teams, or have roles?"*

For ReBAC, list the relations and the actions they allow. Every access check goes through `check(user, action, object)` in `server/authz.ts`. No role checks anywhere else. The engine is the kit's built-in tuples table, injected through the composition root; SpiceDB or OpenFGA can be swapped in later (until research confirms).

| Object type | Relation | Who has it | Allows |
|---|---|---|---|
|  |  |  |  |

## Rules

- Every route checks auth. Other people's resources return "not found".
- All input is validated with a schema at the boundary. Unknown fields are rejected.
- No secrets in code, logs, errors or the client bundle. The logger masks secrets, tokens, emails and personal data by default.
- No personal data in analytics properties. Logs carry internal user IDs only.
- Access decisions go through `check()` (or the owner filter in the repository). Never a role check in a service or a component.
- Public endpoints are rate-limited.
- Agents use test credentials only. Production keys stay with the person.

## Risks we accept, and why

| Risk | Why it's accepted | Revisit when |
|---|---|---|
|  |  |  |
