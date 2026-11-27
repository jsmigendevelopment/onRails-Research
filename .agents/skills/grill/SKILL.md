---
name: grill
description: Use when the person asks to be grilled or interviewed about what to build ("grill me", "ask me questions", "help me figure out what this should do", "auto grill"), for the product interview inside /idea or /join, or before any feature big enough to need a spec. Asks three questions a round by topic, each with a recommended answer, logs every answer, and never skips the decisions people forget. Auto grill: grills itself, then shows one review.
---

# Grill: get on the same page before anything is built

AI fills every gap with a guess. The grill finds the gaps first. A missed decision costs far more later than a question costs now.

## Full or auto

- **Full grill** (the default): you ask, round by round, as below.
- **Auto grill:** you ask four seed questions, grill yourself on every topic, and show the person one review. Chosen in `/idea` step 0, or by `[defaults] grill = "auto"` in the profile. Load `references/auto.md` and follow it. The topics, the floor and the record below still apply. On Full automation, auto grill asks nothing and nothing waits on its review.

## How to ask

- **Three questions per round,** numbered. Under each one, put **Recommended:** with your best answer and a one-line reason, so the person can reply "yes, yes, change 3 to X."
  - Exception: on **taste, scope and money**, ask the open question first. Mark it *(open, no suggestion yet)*, and offer your recommendation only after they answer. A default shown first steers people.
- **Their ideas first.** Ask "what else should it do?", then ask about their answers. Offer your own ideas only when they stall or ask, and make them different from what's already listed. Mark them as yours in `features.md`.
- **Plain words first, term second.** For example: "Should people see each other's lists, or only their own? (That's called access control.)"
- **Confirm with a choice, never "is that right?"** For example: "Do you mean anyone with the link can see it, or only people you invite?" Or show a filled-in example and ask what's wrong with it.
- **No flattery.** If part of the idea is weak, say so and say why.

## Profile and presets

- **Profile:** if `docs/profile.toml` exists, its answers are defaults. Confirm them in one round ("Your profile says private repo, move-fast, Clerk, Cloudflare. Keep all?") instead of asking each one.
- **GitHub Free and a private repo** (`[me] github_plan = "free"`, `repo_visibility = "private"`): say what that loses before they confirm. On `ci = "local"` (the default) the deploys run from the session and no secret is stored in GitHub. Only if the person turns on `ci = "actions"`: GitHub gives a free private repo no environments, so secrets become repository secrets named `TEST_…` and `PRODUCTION_…`. That means no required reviewer on production and no main-only rule. On `ci = "actions"` every workflow on every branch can read the `PRODUCTION_` secrets. On `ci = "actions"` the production deploy is gated only by a manual Run workflow plus typing "deploy production". Offer the choices: keep it private on Free and accept that, make the repo public, or upgrade (Pro or Team adds environments; a required reviewer on a private repo needs Enterprise).
- **Preset:** in the first topic, ask which preset the idea is closest to (see `presets/README.md` in the `idea` skill), with your pick first. The profile's `preset` is the default. Load it, confirm its "Preloaded" answers in one round, and ask its "Still ask" questions in the right topics.
- What the person says always beats the profile and the preset.

## Topics and budgets

Work topic by topic. **Each topic has a soft budget of about 10 questions:** fewer if answers come fast, a few more if the topic is the heart of the app. **Move on early** after three rounds with nothing new, or two "don't know" answers in a row. When the person doesn't know, record a mainstream default as an assumption.

**End every topic with a 3-line summary** the person can correct, then tick it on the coverage map.

### Product topics (`/idea`)

1. **Who and why:** users, the problem, what they do today, what success looks like.
2. **The main flow:** one user's whole journey, step by step.
   - **Then start two jobs in the background** and keep grilling: the competitor scan (see `research`, "Competitor scan") and stage 1 of `wireframes`, the layout. Don't wait for either. Show each screen as it lands.
   - **Feed the drawing.** At the end of topics 3, 4 and 5, tell it what changed: new `must` features and floor items add screens, and the MVP cut drops the ones it doesn't need.
3. **Features:** the person's ideas, questions on each, then yours if they stall. Sort each into must, later or not now.
4. **The floor:** every item on the floor checklist in `features.md` gets an answer or a recorded default. Never skipped.
5. **The MVP:** open with the competitor scan, in five lines or fewer: what exists, what users complain about, and the gaps. Then ask: *"What will yours do that they don't?"* If the scan isn't back yet, say so and continue; revisit the MVP when it lands. The one core piece. Push for one. If they name five, ask which one they'd keep if they could keep only one. **The core is never defaulted.**
6. **Look and feel.** Taste, so ask open questions first and give your suggestion only after they answer:
   - *"Describe the feel in three words."* (for example calm, playful, serious)
   - *"Name two or three apps or sites whose look you like, and what you like about each."*
   - Do they have a logo, brand colours or fonts already? Where are the files?
   - Light, dark, or both, following the device? (Default: both.)
   - Dense like a dashboard, or roomy like a landing page?
   - How should the words sound: friendly, plain, formal, funny?
   - Anything to avoid: colours, styles, or a competitor's look?

   Then sum it up in three lines. If they want visuals, offer a mood board or logo ideas on the creative tier (see `routing`). Write the answers to "Look and feel" in `design.md`. Then start `wireframes` stage 2 in the background: the strongest tier, so ask first unless the profile says not to. A profile's `[design]` answers are defaults to confirm, not skip.
7. **Confirm:** show back the vision, the main flow, the features, the MVP and the look and feel, and ask what's wrong with them.

### Existing-project topics (`/join`, or a big feature)

1. The goal: what change, and why now.
2. Who and what it touches: users, modules, data.
3. What must not break.
4. Conventions: which ones to follow, and which to fix.
5. The finish line: how you'll both know it works.
6. Confirm.

## Keep the record

- The files live in `kickoff/` until the project has a repo, and in `docs/` after that. Start each from the templates in the `idea` skill's `templates/` folder.
- After every round, append the questions, your recommendations and the answers to `grill-log.md`, in the person's own words where it matters.
- Write each decision to `decisions.md` the moment it's made.
- Label every answer's source in `grill-log.md`, and every decision's originator in `decisions.md`, with one of these: **person**, **default** (the person didn't know), **AI** (your idea, taken by the person), **AI pick, approved at review** or **changed at review** (auto grill), or **AI pick, not reviewed** (auto grill on Full automation). An auto grill draft says **AI pick** until the review.
- Keep the coverage map at the top of `grill-log.md` current. A new session resumes from it.

## When you hit an unknown

If neither of you knows the best answer, and the decision is crucial and expensive to undo, log it as an open question and use `research`. Smaller unknowns get three options with trade-offs and a recommendation.

## Done when

Every topic is ticked and summarised, every floor item is answered, and the MVP's core was chosen by the person. In auto mode, also every one-way door was confirmed on its own. On Full automation, the pitch or your best guess stands in for the person, and every pick says "AI pick, not reviewed".

## References

| File | Load when |
|---|---|
| `references/auto.md` | The person chose auto grill, or the profile's `[defaults] grill` is `"auto"` and they kept it. |
