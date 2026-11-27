---
name: automation
description: Use when the person wants to change how much the agents do on their own ("/automation", "switch to recommended", "go full auto", "hands-on mode", "stop merging without me", "let the agents merge", "turn off the overnight loop") - shows the four levels in one short table, asks which one, sets the custom switches for the loop, merges per lane, pull requests, overnight runs and the ping level, and writes the choice to docs/stack.md.
---

# Automation: how much the agents do on their own

Two separate dials. Explain both in one sentence each when you ask:

- **The automation level** says how much agents do without you: run the loop, open pull requests, merge, keep going overnight.
- **The risk dial** says how careful each merge is: which changes you must read first (schema, API, every merge).

Below Full, when the two disagree, the more careful one wins. On Full automation the dial only adds reviews, never a person gate (#103): a careful dial gets schema changes an extra review, not your wait.

## The four levels

| Level | Agents do | You do |
|---|---|---|
| **Recommended** (default) | Run the loop. Build, review and merge the tiny and normal lanes. Deploy to test. | Approve the risky lane and schema changes. Answer batched decisions. Try the app. |
| **Full automation** | Everything, the risky lane included, plus the overnight loop. Never the always-stop list. | Answer blockers only. |
| **Hands-on** | Plan, write issues, and build one issue when you ask. Never open or merge pull requests unless you say so. | Open and merge pull requests. |
| **Custom** | Whatever the switches say. | |

## The switches

| Switch | Recommended | Full | Hands-on |
|---|---|---|---|
| Loop | on | on | off |
| Merges, tiny lane | agents | agents | person |
| Merges, normal lane | agents | agents | person |
| Merges, risky lane | person | agents | person |
| Opens pull requests | agents | agents | person |
| In flight at once | 3 | 3 | 1 |
| Overnight loop | off (`/afk` offers it) | on | off |
| Ping level | decisions | blockers | decisions |

**In flight at once** is how many issues may be claimed and not yet merged. Below Full, that counts claimed work parked on the person: a pull request waiting for their merge, or a claimed issue labelled `needs-human`. On Full, parked work doesn't count, so the loop keeps starting ready issues (`coordinate` step 2). On Hands-on, 1 means one builder the person starts at a time. A low number gets each one to the test site sooner. Raise it only when builders sit idle and the checks keep up.

Ping levels: **decisions** pings blockers at once and batches decisions. **blockers** pings only blockers. **critical** pings only for production down or a live security hole. The `ask` skill has the details.

## Full automation: one prompt

When the person picks Full, say exactly: *"Type your idea once. Agents decide everything else and keep going. You take on the risk of what they do. You can steer any time."*

On Full, `/idea "<pitch>"` runs the whole kickoff with no person step:

- **Auto grill** answers the seed questions from the pitch, and guesses and records the rest (`grill`'s `references/auto.md`).
- **The review** is written in full, every pick marked "AI pick, not reviewed". An ℹ️ FYI sends its link. Nothing waits on it.
- **The wireframes:** both stages run. The approval gate is skipped, and the row says "AI pick, not reviewed".
- **Naming, the stack** (the recommended picks), **the pyramid, the issues and the loop** follow, with no question.
- **A missing key or account** parks only what needs it, as a "Waiting on you" record. The loop goes on.
- **The person steers any time,** in the review or in chat. A changed one-way door becomes a re-plan issue that names what it costs to change.
- **Still never:** the always-stop list. What needs the person (paying, their own logins, real data after launch, stopping a running strongest-tier job) is parked with an FYI; the rest goes on.
- **One rule for every skill:** `references/full.md`. Any ask, wait, confirm or offer becomes the recommended pick, "AI pick, not reviewed" and an FYI line. Rule and check changes get the weakening review instead of the person.

Recommended and Hands-on keep every wait: the review and the wireframe approval.

## Steps

1. **Read the current level** from "Automation level" in `docs/stack.md`. No section yet? The default is `[defaults] automation` in the profile, else Recommended.
2. **Show the four-level table,** then ask which one, with your pick first. Full picked? Say the line under "Full automation: one prompt". Recommend:
   - **Recommended** for most apps;
   - **Hands-on** if the person wants to learn the code or review everything;
   - **Full** only for a side project with no real users.
3. **Custom?** Ask the switches three at a time, each with the Recommended value as the suggestion.
4. **Write it** to the "Automation level" section of `docs/stack.md` (the section is in `templates/stack.md` of the `idea` skill). Fill in every switch, even for a named level. Add a line to `docs/decisions.md`. Commit it through a pull request like any change.
5. **Tell the loop.** The coordinator reads `docs/stack.md` on every sweep, so nothing else is needed. Say what changes from now on, in two lines.

## When to suggest a switch

- **Full → Recommended once real users arrive,** or when the risk dial moves to careful. Say it at `/back` and when an issue first touches real user data.
- **Hands-on → Recommended** when the person says they're tired of merging by hand.
- Never switch on your own. Suggest it, and let the person say yes.

## References

| File | Load when |
|---|---|
| `references/full.md` | The level is Full, and a skill says to ask, wait, confirm, offer or wait for a yes; or a pull request changes agent rules or check code. |

## Who reads it

| Skill | Uses it for |
|---|---|
| `coordinate` | Whether the loop runs, how many issues are in flight, who merges each lane, and whether it opens pull requests. |
| `build` | Whether to open the pull request or stop at a pushed branch. |
| `pr-review` | Whether the verdict says the person must look before merge (below Full; on Full it says no, outside the always-stop list). |
| `issues` | Writing who merges into each issue's lane. |
| `afk` | Whether the loop keeps going overnight. |
| `notify.mjs` (via `ask`) | The ping level. |
