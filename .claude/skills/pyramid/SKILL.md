---
name: pyramid
description: Use when planning how to build an app or a big feature, or checking how a plan is sliced ("plan the build", "break this into milestones", "how should we slice this", "plan the next pass", "is this plan thin enough") - the CTO step. Plans slice 0 (the running app first, then the local checks and a test deploy), cuts the MVP into vertical tracer-bullet slices, stacks them into three passes (Works, Real, Ready), cuts only the current pass into thin steps a person can try, checks the cut with a script, designs the schema and API from the approved wireframes, and re-plans at each pass gate.
---

# Pyramid: see it working early, then make it great

This is CTO work. Run it on the strongest model at high effort. Ask first, once per session, unless the profile says not to or the person already said yes (see `routing`). A session that can't switch models says so once and plans on the model it has. On Full automation: use the current model, record it in `docs/decisions.md`, and don't ask. It plans and designs. It doesn't redraw screens; `wireframes` did, and the person approved them. It doesn't write issues; `issues` does that next on a cheaper model.

## Why

The old way builds in layers: the whole schema, then the whole API, then the whole UI, and you see nothing until the end. **Tracer bullets** cut thin **vertical slices.** Each one goes all the way through (schema → API → UI), so after the first one you can use something real and steer.

**A pass is an improvement** to what's already there. Each pass makes its slices better than the last.

**A slice is a column. A step is one thin cut of it.** A slice is one thing the app lets a person do: "the shared list". A step is the smallest change to a slice that a person can try: "add an item". Each pass cuts its slices into steps. One step is one issue and one pull request. Thin steps keep changes reaching the test site, so the person always has something new to try.

It's standard agile: a step is a user story, a slice is the activity its stories belong to, passes and layers are iterations, the gate is the review, retro and backlog refinement, `features.md` is the backlog, and "Done means" in `docs/pyramid.md` is the definition of done.

The MVP is not one slice and not one pass, so the slices **stack:**

```
pass 3  Ready            ████                 the core polished · speed, a11y, SEO, launch checklist
pass 2  Real      ████   ████   ████          the core deep · supports get the floor items
pass 1  Works ████ ████  ████   ████ ████     a thin tracer bullet through every slice
              sup. sup.  CORE   sup. sup.
```

- **The MVP is 3 passes.** More needs a written reason in `docs/decisions.md` and the person's yes (on Full, the reason and an FYI). Never more than 4.
- **The core slice is the tallest column.** Supporting slices stop once they serve the core.
- **The end of pass 3 is "MVP complete" on the test site. It is not launch.** Launch is the person's call, on the always-stop list, any time after.

## What goes in the MVP pyramid

Only the core, the supporting slices the core can't work without, and the floor (sign-in, who sees what, deleting personal data). Test each slice: **does the core work without it?** Yes? It's not in the MVP.

- A non-core "must" the person insists on: ask once, plainly (on Full, keep it, capped as below, with an FYI). Still a must? It goes in as a supporting slice with the role `insisted`, capped at pass 1 or 2. Record the decision.
- Everything else in `docs/features.md` waits for the top half of the hourglass, below.

## After the MVP: the hourglass

Past "MVP complete" the shape turns upside down and gets wider: more features each layer.

```
layer 3   ████ ████ ████ ████ ████ ████     new features, each in thin · plus a pass on what's there
layer 2     ████ ████ ████ ████
layer 1        ████ core ████
──────────────── MVP complete ────────────────
pass 3            ████
pass 2      ████  ████  ████
pass 1  ████ ████ ████ ████ ████
```

- **Each layer has two parts:** new features, each coming in thin (it works end to end, with the floor), and **a pass on what's already there:** the core every layer, plus the earlier features that feedback or usage points to. Both parts are cut into steps, the same way.
- **The mix is a guide:** about two thirds new, one third improving. The gate shifts it.
- **The gate between layers** is the same as between passes (`references/pass-gate.md`). Plan one layer at a time.
- **Launch** can happen at any layer. It's the person's call.
- **After launch, half-built work still merges.** First cut it so every step is fine to show. If one isn't, build its parts and add the way in (the link or the button) in the last step. Only then use a flag, a switch in config: on in test, off in production, and removed once the feature is out. Turning it on in production is the person's call. Before launch, production shows "Coming soon", so a step rarely needs one: merge it and let the person see it.

## Steps

1. **Slice 0, the skeleton.** Before any feature:
   - If there's a stack pack for the chosen stack (a `stack-<name>` skill), open it and apply it. For the default web stack that's `stack-tanstack-start`. Otherwise set up the same things by hand.
   - **First, the person sees it run.** Start the dev server and show them the starter page (`build`, "Show it"): "The app runs at http://localhost:3000. You'll see the starter page with your app's name." Keys not set? Run it on the fakes. Only then set up the checks, secrets and the test deploy.
   - Every command in the check contract works.
   - Lint enforces the code rules a tool can check (see `AGENTS.md`), and there's a generator that makes a new module from the example one. Write its command in "Commands that work here" in `AGENTS.md`.
   - The checks run from the session before every merge, never from GitHub Actions: `check`, `test:e2e`, a secret scan, the agent-file guard and the stack pack's pull request rules, recorded as the `onrails/check` commit status (`coordinate`). Write `ci = "local"` in `docs/stack.md`, and add no `.github/workflows/`.
   - **Set up in the skeleton** (see `guide/app-conventions.md` in the kit): the error system with request IDs and structured logs, a health endpoint, `/api/v1`, UTC times and money in cents, the ID strategy and standard columns, the audit log, feature flags, `object_action` event names, breakpoints and a type scale in the tokens, per-module `copy.ts`, and generators for module, route, section and component. A stack pack should ship these. Without one, build them by hand.
   - Main deploys to test from the session after each merge, and there's a preview per pull request if the host offers one (the stack pack's `deploy:*` scripts). Record the test URL in `AGENTS.md`.
   - Open `secrets` and wire every key the stack needs.
   - **Set up GitHub for the person:**
     1. If `gh auth status` fails, ask them to run `gh auth login` and wait. On Full, park it in the FYI and keep doing what doesn't need GitHub.
     2. Run `node .agents/skills/name/scripts/setup-github.mjs --dry-run` and show them the list.
     3. Below Full, say in one line what it does (labels, Dependabot, secret scanning, rules on main; on `ci = "actions"` only, a production environment that waits for them) and ask: *"Set this up now?"*
     4. On a yes, run it without `--dry-run` and show the results, including anything skipped because of their plan.
     - Main requires at most the `onrails/check` commit status (only where a probe status posts), never an Actions check.
     - **On Full automation, ask nothing.** `gh` signed in? Run it without `--dry-run`, and put the results in an ℹ️ FYI. Not signed in? Run local mode (`../coordinate/references/local-mode.md`) and list `gh auth login` in the FYI.
2. **Seed data and test users.** Once the schema is designed (step 4), the first step that adds a table also adds a seed script and **two test users**, so `qa` can always sign in and check that one user can't see another's data.
3. **List the slices** from `docs/mvp.md`. One slice is one thing a user can do, end to end. Name the **core.** Keep only slices that pass "does the core work without it?". Not every app needs auth.
4. **Design what the slices share.** Start from the approved screens and tokens in `docs/design.md` and `docs/wireframes/index.html`. No approval row in `docs/decisions.md`? Stop and run `wireframes` first. On Full automation, a `Wireframes: AI pick, not reviewed` row counts as the approval. Apply the tokens to the UI kit's theme, then write the schema and the API contracts the screens need. A screen that must change goes back through `wireframes` for approval. On Full, the changed screen is "AI pick, not reviewed" with an FYI, and the plan goes on. Builders follow this design. They don't invent their own.
5. **Outline every pass.** For each: the milestone name, its slices, and one line per slice on what "better" means.
6. **Cut the current pass into steps,** and only the current pass. For each of its slices, list the smallest changes a person can try, and put each through the thin test below. Order them: slice 0 first, then the step that proves the riskiest idea, usually in the core. Fill in "After" only where one step truly needs another, so steps that don't can be built at the same time.
7. **Write `docs/pyramid.md`** from the `idea` skill's template: the steps go in its steps table, and the current pass is marked `building`.
8. **Check the cut:** `node .agents/skills/pyramid/scripts/check-plan.mjs docs/pyramid.md`. Fix an error by cutting again, not by rewording the row. **Done when** it exits 0 (an empty plan, or a slice the current pass covers with no step, fails it), every pass has an outline row, and only the current pass has steps. Read each warning: it flags a possible layer or developer check. Fix it if you agree. Then hand off to `issues` for that pass only.

## The thin test

A step passes when all four are true:

1. **A person can try it.** Write the try line: what they do on the test site, and what they see. *"Type milk and press Enter: it shows at the top of the list."* Can't write one? It isn't a step. Fold it into the first step that shows something.
2. **It cuts through every layer it needs:** the screen, the logic and the data together. "Set up the database" and "build the API" are layers, not steps.
3. **It's small:** size 4 or under on the complexity scale in `issues`, which is one screen, form or rule on a module that exists. A 5 to 7 says why it can't be cut, and at most one step in three is that big.
4. **It's one thing:** one path, one rule or one state. An "and" in its name often means two steps; the checker warns on it.

- **Count them.** Fewer than two steps per slice means you listed slices, not steps. Cut again.
- **Ways to cut:** the plainest path first, then one rule at a time, one kind of data at a time, one state at a time (empty, error, loading), and the simple version before the nice one. `references/slicing.md` has each one with an example.
- **One schema change per slice per pass.** A migration puts a step in the risky lane, and below Full that lane can wait for the person. So a slice's first step adds its whole table as `docs/design.md` has it, and the steps after it use that table.
- **An open question isn't a step.** Use `research`, or make the first step the thinnest one that would prove the idea wrong.

## Checking a plan

Asked whether a plan is thin enough, or handed one that someone else wrote? Run the checker first, on the file as it is: `node .agents/skills/pyramid/scripts/check-plan.mjs docs/pyramid.md`. Report every error it prints. Then judge what a script can't: whether a person would really do each try line, and whether a step hides a layer behind a friendly name. Don't judge by eye alone. Don't change the plan unless asked.

## Rules

- Every step, in every pass, ends with something a person can **try.** If they can't, it isn't a step yet.
- Don't start pass 2 of anything until pass 1 of the core works.
- A big feature with new screens: run both `wireframes` stages for them and get the approval before you slice it.
- Everything above the current pass is an outline. It gets steps only at its gate.
- A pass ends at the pass gate: a fresh audit and cleanup start at once, the person tries it (on Full, `qa` does, and nothing waits), then a re-plan here. See the References table.

## References

| File | Load when |
|---|---|
| `references/slicing.md` | Cutting a slice into steps, a step won't pass the thin test, or the plan checker fails. |
| `references/pass-gate.md` | Every issue in the current pass is merged, or you're re-planning at a gate. |
