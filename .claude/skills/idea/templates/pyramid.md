# Tracer-bullet pyramid

## Slice 0: the skeleton

- [ ] The app runs locally, and the person has seen it
- [ ] Every check runs from the session before each merge (`onrails/check`), with no GitHub Actions
- [ ] Boundary check on
- [ ] Main deploys to test. Test URL: 
- [ ] A preview per pull request (if the host offers one)

## Slices

Only slices the core can't work without. Role: core, support, or insisted (a non-core must the person kept; pass 1 or 2 only). A slice is a column of the pyramid. Each pass cuts it into steps, below.

| Slice | Role | What a person can do after pass 1 |
|---|---|---|
|  | core |  |
|  | support |  |

## Outline: every pass

Status: `outline`, `building`, `gate`, `done`. One pass is `building` at a time. More than 3 passes needs a `decisions.md` row; never more than 4.

| Pass | Milestone | Slices | What "better" means, per slice | Status |
|---|---|---|---|---|
| 1 Works | | slice 0, then every MVP slice | thin and working end to end | building |
| 2 Real | | core + supports | the core deep; supports get the floor items | outline |
| 3 Ready | | core, then the whole app | the core polished; speed, a11y, SEO, launch checklist | outline |

Pass 3 done = **MVP complete on the test site.** Not launch. Launch is the person's call.

## Current pass: steps

<!-- Only the pass marked building. One row per step, in build order. One step is one issue and one pull request.
     Try it: what the person does on the test site, and what they see. No try line, no step.
     Size: the issue's complexity, 1 to 10. 4 or under is thin. A 5 to 7 says why it can't be cut: "5 · <reason>". At most one step in three.
     After: the numbers of the steps that must merge first. Empty when none.
     Check it: node .agents/skills/pyramid/scripts/check-plan.mjs docs/pyramid.md -->

| # | Step | Slice | Try it | Size | After |
|---|---|---|---|---|---|
| 1 | The skeleton | slice 0 | Open http://localhost:3000, then the test URL: the starter page shows the app's name | 5 · sets up the app, the checks and the test deploy | |

## Done means

A step is done when all of this is true, and not before:

- every `auto` acceptance check has a passing test that carries its ID;
- the checks passed on the merged head commit (`coordinate` step 6.1) and on main after the merge (step 8), and the lane's reviews passed on that same head commit;
- it's merged to main, live on the test site, and the smoke test passed;
- its try line is on the "To try" list in `docs/state.md`.

A pass is done when every one of its steps is done.

## Gate record

| Pass | Date | Feedback issues | Audit | Cleanup issues | Flow | Re-plan |
|---|---|---|---|---|---|---|
|  |  |  |  |  | <!-- steps merged · median hours from pull request to merge · longest gap between merges --> |  |

## Debt

<!-- "Nice to have" review findings, audit findings and refactors not yet picked. Worst first. -->

## After the MVP: the hourglass

<!-- One row per layer. Each layer: new features (each in thin) plus a pass on what's already there (the core every layer). Plan one layer at a time; the gate runs between layers. -->

| Layer | New features | Pass on what's there | Gate |
|---|---|---|---|
| 1 |  | core |  |
