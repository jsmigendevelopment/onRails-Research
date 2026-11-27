---
name: issues
description: Use to turn a plan, the current pyramid pass, feedback or a bug into issues an agent can build alone ("write the issues", "turn this into tickets", "I tried the app, here's my feedback", "file a bug") - one issue per step, each with a try line, WHEN/THEN acceptance checks that carry IDs, tagged auto or agent, an out-of-scope fence, dependencies, modules touched, risk flags and lane, a complexity score, priority and the skills to load, then a read-only consistency check. Runs on the everyday model from the CTO's plan.
---

# Issues: the contract between the plan and every agent after it

A builder knows only what the issue says, plus `AGENTS.md` and `docs/design.md`. Whatever the issue leaves unsaid, the builder will guess.

Write issues from the CTO's plan (`docs/pyramid.md`, `docs/design.md`) on the everyday model at medium effort. The design decisions are already made, so don't redesign here. If the plan has a gap, it's a ⏳ decision: write the issues you can, and use the `ask` skill for the gap. A gap in the MVP core is a 🛑 blocker.

**On Full automation,** the CTO decides every gap instead: a plan gap, an MVP-core gap, a `[NEEDS CLARIFICATION]` marker and a consistency-check gap. Record each as "AI pick, not reviewed" in `docs/decisions.md`, write the issue, and list them in one ℹ️ FYI.

**Hands-on** automation: write the issues and stop. Don't add `status:ready` unless the person asks. They pick what gets built.

## Steps

1. **The current pass only.** One milestone per pass in `docs/pyramid.md` (or per feature, for a project that's already built). Write detailed issues for the pass marked `building`, or the next pass during its gate's re-plan. Asked for issues for a later pass? Refuse: it stays an outline until its gate has run (`pyramid`'s pass gate). Offer the gate if the current pass is done.
2. **Check the plan first:** `node .agents/skills/pyramid/scripts/check-plan.mjs docs/pyramid.md`. It prints errors? Write no issues from that plan. Say what it found and send the plan back to `pyramid` to cut again. The one error to pass over is "no steps table", on a plan made before steps.
3. **One issue per step:** each row of the steps table in `docs/pyramid.md`. Copy its try line into the issue's "Try it" section, word for word. A step that needs more than one issue is two steps: send it back to `pyramid` to cut. No steps table (a plan from before steps)? One issue per slice, and split anything a reviewer couldn't read in one sitting, about 400 changed lines.
4. **Fill in every field** of `.github/ISSUE_TEMPLATE/slice.md` (copy it from this skill's `templates/` if it's missing).
5. **Acceptance checks.** Write each one as `AC-<issue>-<n>: WHEN <situation> THEN <result>`, numbered from 1, one result each. The test that proves it carries the ID in its title. No number until the issue exists? Create it, then add the IDs with `gh issue edit`.
   - **`auto`:** becomes an automated test that the local gate runs on every pull request (`coordinate` step 6.1). Most checks should be `auto`.
   - **`agent`:** needs judgement (layout, flow, copy). A fresh `qa` agent checks it on the preview before merge. Write the steps to click and what you should see.
   - **A number, an estimate, a price or a formula changes?** It gets an `auto` check with real expected values for several inputs, not only an `agent` check: `AC-9-2: WHEN the length is 2 minutes THEN the estimate says 2 min`.
   - For anything a signed-in user owns, add one check that **a signed-out visitor and a second user can't read or delete it.**
   - **Unsure what the person wants?** Write `[NEEDS CLARIFICATION: <question>]` where the gap is, and ask it through `ask`. A marker blocks `status:ready`. Answered? Replace the marker with the answer.
6. **Complexity.** Write `Complexity: <1–10> · <one-line reason>`. Score the hardest part, not the line count. **Aim for 4 or under.** At 5 to 7, the reason says why it can't be cut thinner. **Above 7, split it** before it's ready.

   | Score | Looks like |
   |---|---|
   | 1–2 | Copy, styling or config. One file, no logic. |
   | 3–4 | One screen, form or endpoint on an existing module, copying the nearest example. |
   | 5–7 | A new module end to end (table, service, API, screen), or rules with edge cases: permissions, money, time. |
   | 8–10 | Several modules, a new outside service, a data migration, or something the repo has never done. Split it. |
7. **Risk flags and lane.** Tick every flag that applies, then set the lane:
   - **tiny:** copy, styling or config with no logic. Build, local gate, review, merge.
   - **normal:** anything else. Build, local gate, review, `qa` on the preview, merge.
   - **risky:** any flag ticked. Normal, plus `pr-security`, plus the human gate in `docs/stack.md` (none on Full).
   - **Who merges:** after the lane, write `merged by: agents` or `merged by: the person`. Take it from the "Automation level" switches in `docs/stack.md`, and the risk dial. Below Full, the more careful one wins. On Full it's always `merged by: agents`: the dial adds reviews there, never the person (#103).
8. **Labels.** Create any that are missing first (`gh label create "<name>" --force`):
   - `priority:p0` to `priority:p3`;
   - `pass:<n>`, one per pass in the outline;
   - `slice:core`, `slice:support`;
   - `gate`, on an issue from a pass gate's audit, cleanup pick or feedback about what's built. The loop builds these while the gate runs;
   - `lane:tiny`, `lane:normal`, `lane:risky`;
   - `status:ready` once nothing blocks it: no `[NEEDS CLARIFICATION]` left, complexity 7 or under;
   - `status:in-progress` and `needs-human`, which `coordinate` sets later;
   - `blocker`, added next to `needs-human` when nothing can move until the person answers (see `ask`);
   - `human-approved`, below Full only, which only the person adds, to a pull request that changes the agents' rules. On Full the label doesn't exist: never ask for it (`automation`'s `references/full.md`);
   - `no-issue`, the only way a pull request skips the issue link. Dependabot gets it.
9. **Dependencies both ways:** "Depends on #N" here, and "Blocks #M" on the other one.
10. **Modules touched,** and whether the issue is **decoupled.** That's how `coordinate` knows what can run in parallel.
   - **A slice that creates a module:** write "Use the generator: `<command>`" in the goal, with the command from "Commands that work here" in `AGENTS.md` (for example `pnpm new:module <name>`). No generator yet? Write "Copy `<the nearest existing module>`" instead.
11. **Skills line:** `build`, plus at most two more, named exactly. A skill named in the issue gets loaded. One that's only installed may not be. Pick the know-how the work needs:
   - `stack-<name>` for the project's stack;
   - `a11y` for any new screen or form;
   - `web-security` for public endpoints, forms and anything user-supplied;
   - `web-performance` for heavy pages, media or 3D;
   - `seo` for public pages;
   - `dependencies` when adding a library.
12. **Recipes line:** when the work needs one of the kit's default libraries, name its recipe, so the builder loads it: `Recipes: form` (a form), `table` (a data grid), `charts` (a chart), `markdown` (rendered Markdown), `highlight` (code highlighting), `virtual` (a long list), `hotkeys` (keyboard shortcuts); `start`, `router` and `query` for route, URL-state and server-data work in a TanStack Start app. They don't count toward the three skills. The first issue that needs one also installs it (add `dependencies` to its `Skills:` line); nothing is installed before that.
13. **Consistency check,** after the issues for a pass or a re-plan are written. Start a fresh agent with "Read `.agents/skills/issues/references/consistency.md` and check pass <N>." It reads, reports and changes nothing. Then act on each gap: a slip in an issue you wrote gets fixed there; anything missing becomes a new issue; anything that needs a call goes to the person through `ask`. **Done when** the report is clean, or every gap is an issue or a question.

## References

| File | Load when |
|---|---|
| `references/consistency.md` | Step 13: you are the fresh checker. |

## Every change has an issue

One issue, one branch (`feat/<n>-short-name` or `fix/<n>-short-name`), one pull request that says `Closes #<n>`. Work someone asks for without an issue gets one first. On a stack with `pnpm pr:rules` (the web pack), that script fails a pull request with no link unless it has `no-issue`. The local gate (`coordinate` step 6.1) checks the same rules on every stack with the kit's `pr-rules.mjs`, run from main. Why: `guide/app-conventions.md` in the kit.

## No GitHub yet?

Write each issue as `docs/issues/NNN-short-title.md` from the same template, with `Status: ready` under its title. `coordinate`'s local mode reads that file and line. Move them to GitHub once there's a remote.

## From feedback or bugs

One issue per point, in the person's words: "what I saw, what I want." For a bug: the steps, what was expected, what happened, a screenshot, and the PR that caused it if known. Its "Try it" line is how the person will see the fix. Tag it with the current pass. From a pass gate, tag it with the next pass and label it `gate`. A new idea is not an issue yet: add a row to `docs/features.md`, and the next re-plan places it.

**A one-way door changed after the build started** (the data model, auth and access, hosting and the database, money and time, the module boundaries), from any skill, after either kind of grill: write one issue titled "Re-plan: <door>", never a quiet edit. Its body opens with **Cost to change:** what undoing it takes now (the review's "Cost to change later" line if there is one, plus the modules, data and merged issues built on it), then the picks that move. On Recommended and Hands-on, label it `needs-human` and confirm the cost through `ask`. On Full, an agent's own change gets an ℹ️ FYI and goes ahead; the person's change is their answer, so it goes ahead too. Deleting or migrating real data is a 🛑 blocker on every level.
