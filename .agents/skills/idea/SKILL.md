---
name: idea
description: Use when the person has an idea for a new app, product or tool ("I have an idea for an app", "new project", "let's build X", "start a new app"). Runs the whole kickoff in order - pitch, product grill by topic with the wireframes drawn alongside, the MVP, naming the repo, wireframe approval, tech grill, the tracer-bullet pyramid, then issues - and hands off to the build loop.
---

# /idea: from idea to a planned repo

Run the steps in order. Don't write app code before step 10 unless the person says so. Save to files after every step, so a break or a new session loses nothing.

**One prompt on Full automation.** The person gave the pitch with `/idea "<pitch>"`, and the level is Full (they said so, or the profile's `[defaults] automation = "full"`)? Ask nothing, from step 0 to the loop. Use auto grill. Say the level and the grill in one line, then run every step. Each step's "On Full" line says what replaces the person's answer. Every other level asks as written.

**Preflight first.** Before step 0, run `node .agents/skills/ask/scripts/preflight.mjs --model <your model> --effort <your effort>`. It probes your own sandbox in about 10 seconds and prints one table. A `✗` row? Follow `../ask/references/preflight.md`: fix what you can, climb its ladder, and ask for the rest in ONE message. Installs blocked? The kickoff goes on, but nothing is scaffolded until they work.

**Each step names the skill to open.** Open it before the step, even if you think you know what it says. If your tool doesn't load it by name, read `../<skill>/SKILL.md` from this folder.

## Steps

0. **Load the person's profile.** If `~/.onrails/profile.toml` (or `~/.ai-dev-workflow/profile.toml`, its folder's name before the rename) exists and this project has no `docs/profile.toml`, copy it in with `npx onrails profile copy`. Copying by hand? Replace `[research] library` and `library_path` with `# <key>: set in your personal profile only`: they name a private repo. If neither exists, offer once to make one from `templates/profile.toml`: *"Want a personal profile so I stop asking the same questions every app?"* Everything in the profile is a default you confirm, not a question you ask. On Full, don't offer a profile: use the project's or none.
   - **Then ask the first question: the automation level** (see `automation`). Show this table first, and say in one line each how it differs from the risk dial (asked later, in the tech grill): *the automation level is how much agents do without you; the risk dial is how careful each merge is.*

   | Level | Agents do | You do |
   |---|---|---|
   | **Recommended** (default) | Run the loop. Build, review and merge small and normal changes. Deploy to test. | Approve risky changes and schema changes. Answer batched questions. Try the app. |
   | **Full automation** | Everything, risky changes too, plus overnight. Never the always-stop list. | Answer blockers only. |
   | **Hands-on** | Plan, write issues, build one issue when you ask. | Open and merge every pull request. |
   | **Custom** | You set each switch. | |

   - The profile's `[defaults] automation` is the suggested pick. Full picked? Say `automation`'s one-prompt line. Write the answer to `kickoff/decisions.md`. `stack` copies it into the "Automation level" section of `docs/stack.md` in step 7.
   - **Then ask: "Full grill or auto grill?"** In one line each: *full: I ask you about three questions at a time, topic by topic. Auto: you answer four questions, I make every other pick with two alternatives, and you review it all at once.* Full is the suggested pick for a first-time user. The profile's `[defaults] grill` overrides that. Write the answer to `kickoff/decisions.md`.
   - **Then ask once, unless the profile already says `ask_before_strongest = false`:** *"May the planner use your strongest model without asking each time?"* Save the answer as `[routing] ask_before_strongest` in `docs/profile.toml` (a yes is `false`; make the file with that one key if there's none). After a yes, the kickoff never asks again; after a no, step 9 asks once per session. `routing`'s first rule reads it. On Full, don't ask: the current model is used.

1. **Listen to the pitch.** Ask the person to describe the idea in their own words: what it is, who it's for, and any features they already have in mind. Don't interrupt yet. Then play it back in 3–5 lines and give your honest first take: what's strong, what's unclear, what's risky. Don't flatter. On Full, the pitch came with `/idea`: play it back and go on, without waiting.

2. **Product grill.** Open `grill` and run its product topics. Auto grill? `grill` loads `references/auto.md`: the seed questions, the self-grill, then the review. The review also picks the name shortlist's winner and the stage-1 layout. Until the repo exists, the notes live in a local `kickoff/` folder: `grill-log.md`, `decisions.md`, `features.md` and `vision.md`, each started from this skill's `templates/`, plus `kickoff/research/README.md` from `templates/research-index.md`, so the first dossier has a home.
   - **Background work starts here.** At the end of the main-flow topic, the grill starts the competitor scan (`kickoff/research/competitors.md`, ready by the MVP topic) and `wireframes` stage 1, the layout. Once look and feel is answered, it starts stage 2, the detailed UI and UX. Each screen is shown as it's done (full grill; in auto mode, hold screens for the review). No way to run them in the background? Draw stage 1 after the grill and stage 2 after step 5.
   - If the person needs a break, save and stop. `/back` resumes from the grill log.

3. **Find the MVP.** This is the grill's MVP topic: **the one core piece that makes this app stand out,** made as good as possible, plus only the thin supporting slices it can't work without. Test each: *does the core work without it?* **The core is never filled in with a default.** If the person won't choose, stop here and say so. **On Full,** auto grill guesses the core from the pitch, records it as "AI pick, not reviewed", and goes on: never stop here. Write `kickoff/mvp.md` from `templates/mvp.md`.

4. **Other accounts?** While stage 2 draws, ask once whether the person uses more than one Claude or Codex account, and which projects or jobs belong to each. On a yes, give one "Setup step for you" per account to sign it in from their terminal, then write `[accounts]` in the profile. `routing`'s `references/accounts.md` has the questions, the verified commands and the rule: a fixed split, never by usage. On Full, skip it and use this account.

5. **Intermission: name it and make the repo,** while stage 2 finishes. Open `name`. After an auto grill, the name was picked at the review, so start at its step 3. On Full, `name` asks nothing. It runs `git init`, sets up GitHub if the person wants it, and moves `kickoff/` into `docs/`.

6. **Approve the wireframes.** Below Full, revise the full stage-2 set until the person says yes (`wireframes` stage 2, steps 5 and 6). **Gate:** no tech grill and no pyramid until `docs/decisions.md` has the approval row. Auto grill doesn't skip it. **On Full,** skip the wait: record the row as "AI pick, not reviewed" (`wireframes` stage 2, step 6) and go on.

7. **Tech grill.** Open `stack`: platform, stack, architecture, API, data, UI kit, auth, environments, the local checks (no GitHub Actions) and the risk dial, plus the automation level from step 0. It's short. After an auto grill, the one-way doors confirmed at the review are answers, not questions. On Full, take the recommended picks with no question round. Crucial unknowns go to `research` first (on Full, it decides and sends an FYI). It writes `docs/stack.md`, `docs/architecture.md` and `docs/security-policy.md`.

8. **Fill in the project facts** at the bottom of `AGENTS.md`.

9. **Plan the build.** This is CTO work: the strongest model, high effort (see `routing`). Open `pyramid`. It plans slice 0 (the skeleton), outlines all three passes, cuts pass 1 into thin steps the person can try, checks the cut with its script, and designs the schema and API from the approved wireframes. It writes `docs/pyramid.md` and `docs/design.md`.
   - Not on the strongest model? The tier question is asked once per session (`routing`'s first rule). After a yes, plan on it if this session can: a subagent or a cloud session on that model. It can't switch? Say so once, plan on the current model, and record the model and effort in `docs/decisions.md`. Never tell the person to start a new session. On Full, carry on with the current model and record that in `docs/decisions.md`.

10. **Write the issues.** Everyday model, medium effort. Open `issues` for pass 1 only: one issue per step. Run its consistency check (its last step). Gaps become issues or questions for the person before step 12. On Full, a gap becomes an issue or a recorded guess, never a question.

11. **Keys and accounts, before any building.** Open `secrets` now, not when a deploy is stuck. Nothing reaches the test site until these exist, so ask while the person is still here:
   - List every account and key the first test deploy needs (for the default stack: a Cloudflare login and a Clerk app), plus the ones later slices add, marked "later".
   - Say it plainly: *"The test site can't go live until these are set. It takes about 10 minutes. Want to do it now?"*
   - Wire them through the `secrets` checklist. Values never go in the chat. If they'll do it themselves, that's `pnpm connect` in their own terminal, about 10 minutes; check the result by name with `pnpm connect --dry-run`.
   - On Full, don't ask: record each missing one under "Waiting on you" as a parked item, not a 🛑 blocker, and list them all in one ℹ️ FYI. The app runs on its fakes.
   - Otherwise, if they say later: write each missing one to "Waiting on you" in `docs/state.md` as a 🛑 blocker for the first deploy, and say building will continue and the app runs locally on its fakes, but the test site stays dark until then.

12. **Hand off.** Write `docs/state.md` from `templates/state.md`, then run preflight again with `--record`, so its `Environment:` line is filled in. Then tell the person, in under 10 lines:
   - what's planned;
   - which issue goes first;
   - **when they'll first see it:** running locally at the start of slice 0, before the checks and deploys are set up; on the test site once slice 0 merges, and what still has to happen before then;
   - that each merged step comes with a line on what to try, and feedback can come any time;
   - that at the end of a pass the loop keeps going on fixes and cleanup, and the next pass is planned only once they've tried it. On Full: once `qa` has tried it and the re-plan is done (`pass-gate.md`).

   On Full, send this as the FYI and end with the loop starting, not a question.

   **Then start the loop.** Automation level not Hands-on? Open `coordinate` now, without asking, and say so in one line: *"Starting the build loop: it builds every ready issue in order and shows you each step."* "Go ahead", "start" or "yes" always means the loop, never one issue. Build one issue at a time only on Hands-on, or when the person says those words. **Done when** `coordinate` is running, or the level is Hands-on and the person knows which issue to ask for first.

## Done when

- `docs/` holds the vision, features, MVP, decisions, stack, architecture, security policy, design, wireframes, pyramid, state and `research/README.md`.
- `docs/decisions.md` has a "Wireframes approved" row (on Full, "Wireframes: AI pick, not reviewed") whose hash matches `docs/wireframes/index.html`.
- `node .agents/skills/pyramid/scripts/check-plan.mjs docs/pyramid.md` exits 0. An empty plan fails it: the Slices table lists the slices, the current pass has steps, and every slice that pass covers has at least one.
- Every pass 1 issue has a try line, WHEN/THEN acceptance checks with IDs, a fence, dependencies, risk flags, a lane, a complexity score, a priority and a `Skills:` line, and the consistency check found no open gap.
- The person has seen and approved the plan. Their "go" is the approval, not a separate start: the loop starts by itself (step 12). On Full, nobody was asked: the loop is running and the person has the review's FYI.
