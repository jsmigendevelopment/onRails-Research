---
name: routing
description: Use when choosing which model, provider and effort level runs a job ("which model should do this", "what effort", "route this issue", "which account runs this") - planning, grilling, research, design, writing issues, building, reviewing, security review, coordinating, browser checks and art. One table maps each job to a tier and an effort, starts low, and escalates one step only after a verified failure. Another table says where each job runs, cloud first; accounts are a fixed split by job or project, never by usage.
---

# Routing: the right brain for each job

Picking the model, provider and effort is a skill of its own. The strongest model at high effort for everything is slow and burns your limits. The cheapest model for everything ships junk.

**This table is the routing.** The coordinator reads it for every job. Issues don't repeat it; they only note an override when one is truly needed.

## Tiers

Fill in this column with what *you* have. The example column shows one working setup (checked 2026-11).

| Tier | For | Example |
|---|---|---|
| **Strongest** | the CTO jobs: deep research, planning, design | Claude Fable 5.2 |
| **Everyday** | talking, writing issues, building, reviewing | Claude Opus 5.5 |
| **Creative** | art, visuals, names, very creative ideas | ChatGPT, top model |
| **Second opinion** | a second reviewer on risky changes | Another vendor's model |

Effort is a second dial on every model: **low**, **medium** or **high**. Some models add **extra-high**.

## Jobs

| Job | Tier · effort |
|---|---|
| The live thread you talk to all day (coordinator) | Everyday · **low**. Medium once the app is in good shape. Speed matters more than depth here. |
| Grill and planning chat | Everyday · medium |
| **Auto grill:** the self-grill and its review | **Strongest · high, or Everyday · high or extra-high.** It makes every early decision. Recommend it plainly, then ask under the first rule below. Models: "Auto grill" below. |
| Competitor scan (background, during the grill) | Everyday · medium. Broad searching, not design, so it doesn't ask first. |
| Wireframes stage 1, layout (background, from the grill's main-flow topic) | Everyday · medium. Grey boxes, not design, so it doesn't ask first. |
| Wireframes stage 2, detailed UI and UX (background, from the look-and-feel topic) | **Strongest · high** |
| **CTO:** research, the pyramid and each pass gate's re-plan, schema, API design | **Strongest · high** |
| Capture to the research library | The research's own tier and effort for its provenance record. The copy, index, checks and pull request: Everyday · low. |
| Pass-gate audit (read-only, fresh) | Everyday · medium |
| Writing issues from the CTO's plan | Everyday · medium |
| Art and visual concepts | Creative |
| Building an issue | Everyday. Effort from its `Complexity:` line: 1–4 **low**, 5–7 medium. Pass 2+ starts at medium. Never the strongest tier without asking. |
| Code review (`pr-review`) | Everyday · **never below the builder's effort** |
| Security review (`pr-security`), risky lane only | Everyday, one step above the code reviewer. Add a second-opinion reviewer when the change touches personal data or money. |
| Acceptance and browser checks (`qa`) | Everyday · low |

## Auto grill

Recommend a run from this table when the person picks auto grill. Ask before the strongest tier, as the rules say. The model names are the example setup (checked 2026-11). Map them to your own tiers.

| | Claude | ChatGPT / Codex |
|---|---|---|
| **Fine for most people** | Opus 5.5 at high or extra-high effort | GPT-6.2 Sol at high or extra-high effort |
| **Best result** | Fable 5.2 at high effort | GPT-6.2 Astra at extra-high effort |

Can't switch models in this session? Say so once, carry on with the current model, and write the model and effort used to the grill log's provenance. The yes or no is asked once per session (the first rule below).

## Where a job runs

Cloud first: `[sessions] prefer = "cloud"` in the profile. Unattended work runs in a cloud session. Work that needs this machine runs here. The job names are the ones `[accounts]` uses.

| Job | What it covers | Runs |
|---|---|---|
| `live` | the thread you talk to, the grill | where you are |
| `cto` | the pyramid, re-plans, schema, API, wireframes | cloud |
| `research` | `research`, the competitor scan | cloud |
| `build` | one builder per issue | cloud. Local when it needs a simulator, a device, a signed-in browser, local files or hardware. |
| `review` | `pr-review`, `pr-security`, `qa` before merge | cloud. Local for "my own browser" checks. |
| `evals` | behaviour tests of the skills | cloud or locally |
| `overnight` | the `/afk` loop | cloud |

`prefer = "local"`, or no cloud sessions in your tool? Everything runs here.

## Rules

- **Ask before using the strongest tier, once per session.** It's the most expensive and the most limited. Say which jobs you'd send to it and why, and start only on a yes.
  - **A yes covers the whole session and every CTO job in it.** Write it down at once: `- **Strongest tier:** yes · <session> · <UTC time>` in `docs/state.md` (`kickoff/decisions.md` before the repo exists). A no is written the same way. Read that line before you'd ask, and never ask again in that session.
  - **Skip the question** when `docs/profile.toml` sets `ask_before_strongest = false`. `/idea` and `npx onrails profile init` ask that once, at setup.
  - **Can't switch models in this session?** Say so once, carry on with the current model, and record the model and effort used in the plan's provenance (`docs/decisions.md`, or the grill log). Never tell the person to start a new session for a model.
  - On Full automation: use the current model, record it, and don't ask.
- **Never stop or restart a strongest-tier run without the person's yes.** It throws away work already paid for. Before any restart, check for reusable output and say what it costs (`ask`, "A running job"). Everyday-tier runs may be restarted.
- **Start low. Escalate one step only after a verified failure:** a failed check or a rejected review, not a hunch.
- **Spend the strongest model on thinking, not typing.** It designs. Cheaper models write the issues and the code from its design.
- **Change what reviewers see before you change how hard they think.** Hide the PR description, and give them a written policy and the check results. Extra effort found no more bugs in testing.
- **Buy what you'd rather not review.** Use an auth provider instead of reviewing hand-made auth.
- **Accounts are a fixed plan set by the person. Never move or spread work between subscription accounts because of usage limits.** Each account owns its projects and jobs (`[accounts]` in the profile). At a limit, that account's work waits for the reset, with an ℹ️ FYI and the reset time. Providers' terms can treat moving work as account rotation, and losing the account you build with stops everything. A job for another account gets a ready-to-paste prompt, not a run here. See `references/accounts.md`.
- **Re-check this table when models change.** Routing that was right last month may not be right now.

## References

| File | Load when |
|---|---|
| `references/accounts.md` | Onboarding asks about other accounts, a job belongs to another account, or an account hits its limit. |
