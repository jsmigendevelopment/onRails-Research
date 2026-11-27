---
name: build
description: Use when implementing one issue ("implement issue 12", "build this issue", "work on issue 7", or a brief that says use the build skill) - reads the issue and the design, works inside its fence on its own branch, turns every auto acceptance check into a test first, follows the architecture, runs every check, and opens a pull request that closes the issue. One issue per fresh session.
---

# Build: one issue, one fresh session, inside the fence

## Steps

0. **Preflight:** `node .agents/skills/ask/scripts/preflight.mjs --if-changed --record`. It skips the probes when `docs/state.md` says `Environment: ok` and the sandbox hasn't changed. A `✗` row? Follow `../ask/references/preflight.md` before anything else: fix what you can, climb its ladder, ONE message for the rest. Installs blocked? Don't scaffold, and don't build what needs them.
   - **In a worktree the loop just made for you** from the person's repo, and the line under the table says it isn't marked read? A worktree needs its own mark: `node .agents/skills/ask/scripts/preflight.mjs --mark-read`, then preflight again. Its files come from the repo's own commits.
   - **Say you've started:** `node .agents/skills/coordinate/scripts/board.mjs event started issue=<n> title="<issue title>" thread="<your session name>"`. If it can't write (a cloud thread), skip it. The `status:in-progress` label carries it.
1. **Read the issue in full,** then `docs/design.md` for its screens, schema and API, and `docs/architecture.md`. Open `docs/stack.md` only if you're adding a library. Load the skills named on its `Skills:` line, and read every recipe on its `Recipes:` line (`.agents/skills/stack-tanstack-start/references/tanstack/<name>.md`): a form, data grid, chart, Markdown, code highlighting, long list or keyboard shortcuts follows its recipe, and its "Done when" list is part of the acceptance checks.
   - **Sent by another session?** Your brief is a handoff (`../ask/references/handoffs.md`). Before any work, comment the receipt on its record: `Got it · <your session> · My reading: <one line>`. Your reading differs from the owner's quoted words, or they could mean two things? That's step 2.
2. **Unclear? Ask, don't guess.** An unclear issue, one with a `[NEEDS CLARIFICATION]` marker, or a brief your reading doesn't match, is a ⏳ decision. Use the `ask` skill: comment up to three questions, each with your recommended answer, label it `needs-human`, ping, and stop work on this issue. Run alone? Start the next ready issue (step 14, "Run alone"); there's no branch of this one to take on. If the work would hit the always-stop list, it's a 🛑 blocker instead.
   - **Blocked by setup** (no environment, key, account or access)? Climb "Try before you block" in `ask`. What's left gets a `needs-human` record with the "Setup step for you" and a ping, in this turn. Then build every part that doesn't need it. Never end on "the person will have to fix it" in chat alone.
3. **Branch** from the latest main: `feat/<n>-<short-name>`, or `fix/<n>-<short-name>` for a bug. In the loop, use the branch your brief names. No issue, no branch: ask for one. Start each commit message with the issue number.
   - **Run alone, and no claim on the issue names your branch?** Comment one, as `coordinate` step 3 writes it: `Claimed by <session> at <time> · branch <your branch>`. The loop's local checks run only a branch a claim names.
4. **Copy the nearest example.** Find the closest module, route or test the repo already has, and match its naming, error handling, layout and test style. If a generator exists (`pnpm new:module` or similar, listed in "Commands that work here"), use it. Never free-write a module a generator makes.
5. **Tests first: red, green, refactor.** Turn every `auto` acceptance check into a test whose title starts with the check's ID: `AC-12-2: WHEN a visitor is signed out THEN the list answers 401`. One check per test. Take one check at a time:
   1. **Red.** Write the test for this check. Run it and watch it fail for the right reason: the assertion, not a typo or a missing import.
   2. **Green.** Write the least code that makes it pass. Nothing for the next check yet.
   3. **Refactor.** Tidy names and repeats while every test stays green. No new behaviour.

   Then the next check. Don't write every test first and then all the code: a batch of tests tests what you imagined, not what you built.
   - **A bug or core logic** (business rules, permissions, money): small steps, one small test per cycle. A bug fix starts with a test that reproduces it (the `diagnose` skill). For wiring, a simple screen or config, bigger steps are fine, but each check's test still comes before its code.
   - Test behaviour through the public interface. Mock only the edges: network, clock, randomness. Use the memory fake, not mocks of your own code.
   - Expected values come from the issue or a worked example, never recomputed the way the code computes them.
   - No snapshot tests for logic. Each test must fail without your change.
6. **Stay inside the fence.** Build nothing from "Out of scope." Found another problem? Open a new issue for it.
7. **Follow the design and the architecture:**
   - the screens and contracts in `docs/design.md`;
   - feature modules don't import each other;
   - controller → service → repository/client;
   - the UI kit's components and design tokens. No one-off colours, spacing or font sizes. A new token is the person's call, so ask (on Full: add it, "AI pick, not reviewed", in the FYI);
   - the app conventions in "App rules" below.
8. **Write it the owner's way:** follow "Code rules" below. Installing a package? Open the `dependencies` skill and verify it first.
9. **Update the docs** your change makes wrong, in the same pull request.
10. **Run every check** in "Commands that work here" in `AGENTS.md`: lint, typecheck, the boundary check, tests and build. All of it must pass.
11. **Show it.** Did the step change what the person sees? Follow "Show it" below, and put the look in your report and the pull request.
    - **Checking it in a browser yourself?** Load `test-by-hand-as-the-user`: predict every output first, move every input, and put its table in your report.
12. **Open the pull request as a draft** (`gh pr create --draft`; if GitHub refuses drafts on this plan, open a normal one) with `Closes #<n>` in the body, the issue's try line, and, for each AC ID, the test file that covers it or the `agent` steps to try. Keep the description short and factual. Reviewers judge the diff, not the description.
   - Aim for under about 400 changed lines, not counting lockfiles and generated files. Bigger? Split it, or label it `large-pr` and say why.
   - **Post the preview,** where the project's `package.json` has `deploy:preview`: run `pnpm deploy:preview <n>` once the pull request is open, and again after each push, on the pushed head with nothing uncommitted. Link it in your report and on the pull request (the pack's script keeps one comment with it), so review and `qa` use it. It fails for a sign-in or a key? Climb "Try before you block" in `ask`, say what's left in your report, and go on.
   - **Hands-on** automation (see "Automation level" in `docs/stack.md`)? Don't open it unless the person said to. Push the branch and tell them its name and the check results.
   - Then add `node .agents/skills/coordinate/scripts/board.mjs event pr-opened issue=<n> pr=<n> title="..."`.
13. **Handing work on?** Anything you pass to another session is a handoff: write it down with the owner's exact words and schedule the follow-up (`../ask/references/handoffs.md`).
   - **No pull request** when your brief says "Local mode", or there's no GitHub remote or API: commit on the branch, push it if there's a remote, and give its head commit. `coordinate`'s local mode reviews and merges it (`../coordinate/references/local-mode.md`).
14. **Finish:** `node .agents/skills/coordinate/scripts/board.mjs event finished issue=<n>`.
    - **Stop what you started for this issue:** `procs.mjs stop <id>` for each, then `procs.mjs list --mine`. Only what the person keeps may be left: the dev server, when you built alone and they're still here.
    - **In the loop** (your brief came from a coordinator, or you are the coordinator building it yourself in local mode): exit, or go back to the coordinator's step. Don't wait for the review, and don't reopen `coordinate`.
    - **Run alone:** give the try line, then keep the loop moving. Hands-on? Stop and report. Otherwise open `coordinate` and run it from here. It arms a sweep timer only if `timer.mjs should-arm` says none is live. It takes your branch, if you made one, through review and merge, and starts the next ready issue. Stop only on a 🛑 blocker with nothing else that can move. **Done when** the next ready issue has started, or you said why nothing can.

## Show it

The person steers by looking. Show each visible step as soon as it renders, on top of the test site, not instead of it.

**Built alone** (the person started you, no coordinator): you show it, steps 1 to 4, on the fixed port. **Built in the loop:** your look is screenshots plus the branch command, never a link. The fixed port belongs to the coordinator. Start your server on a free port only for the screenshots, then stop it. The coordinator keeps the person's server and asks the question.

1. **Start the dev server in the background, through the process registry** (rule 15 in `AGENTS.md`). Use the dev command and port from "Commands that work here" in `AGENTS.md`, or the stack pack's (`stack-tanstack-start`: `pnpm dev`, http://localhost:3000): `node .agents/skills/ask/scripts/procs.mjs start --why "show the person #<n>" --until "the person leaves" -- pnpm dev`. Its output, with the link, is in the log it names. Say it's running. Keep it running while the person is here. Stop it (`procs.mjs stop <id>`) at the end of the session and at `/afk`.
   - **In the loop, or when the port is taken:** pick a free port (`node -e "const s=require('net').createServer().listen(0,()=>{console.log(s.address().port);s.close()})"`) and start `pnpm dev --port <free> --strictPort` the same way, with `--until "the screenshots are taken"`. Screenshot the address the server printed, never 3000. Then stop it.
2. **Keys missing? Run on the fakes:** the memory repositories and test keys. Name each part that is faked or off: "Sign-in is off until the Clerk keys are set." The first look never waits on `secrets`.
3. **Give the person a way to look.**
   - **On their machine:** the link, the page to open and the try line. "The app runs at http://localhost:3000. Open /list: the seeded items show."
   - **In a cloud session** (Claude Code sets `CLAUDE_CODE_REMOTE=true`) **or in the loop,** give both:
     - four screenshots with Playwright's Chromium, written outside the checkout so `git add -A` never picks them up. Run `pnpm exec playwright install chromium` first if it's missing. No Playwright in the project? Use `pnpm dlx playwright@<version> ...` with an exact version you checked on the registry (the stack pack's pin, if it has one), `install chromium` first; or skip the screenshots and give only the command. `S=${TMPDIR:-/tmp}/shots-<n>`, then for each of `light` and `dark`:
       - desktop: `pnpm exec playwright screenshot --viewport-size=1280,800 --color-scheme=light <url> $S/desktop-light.png`;
       - phone: `pnpm exec playwright screenshot --viewport-size=390,844 --color-scheme=light <url> $S/phone-light.png`;
     - the command for their machine: `git fetch && git switch <branch>`, then `pnpm install && pnpm dev`, and the link.
   - **Public repo?** Check with `gh repo view --json visibility`. Public and the app not launched? Pushed screenshots show the unlaunched app to anyone. Say so once and ask whether they may be public (a ⏳ decision through `ask`; in the loop, put the question in your report). On Full, don't ask: keep them private (record "AI pick, not reviewed") until the person says otherwise. Until a yes is in `docs/decisions.md`, push nothing: give the screenshots in your report only, as local paths or images shown in the session.
   - **Get the screenshots to the person** once the pull request exists (step 12). They go on their own branch `B`: `screenshots/pr-<n>`, or `screenshots/<your branch>` when there's no pull request (Hands-on). Never on the pull request's branch or on main. `W=${TMPDIR:-/tmp}/shots-<n>-git`:
     1. `git ls-remote --exit-code origin refs/heads/B` exits 0 (a rerun)? `git fetch origin B:B`, then `git worktree add $W B`, and add a commit on top. Otherwise make it new: `git worktree add --orphan -b B $W`. Git older than 2.42: `git worktree add --detach $W && git -C $W switch --orphan B`.
     2. `cp $S/*.png $W/` and `git -C $W add -A`. `git -C $W diff --cached --quiet && echo unchanged`? Same screenshots as last time: skip the commit and the push. Otherwise commit there and `git -C $W push origin B`. Either way, `git worktree remove $W`.
     3. Post one comment on the pull request with each image: `![desktop light](https://github.com/<owner>/<repo>/blob/B/desktop-light.png?raw=true)`. Put the same links in your report. No pull request? Put the links and `https://github.com/<owner>/<repo>/tree/B` in your report.
   - **A preview or the test site exists?** Link it too.
4. **Ask what to change:** "Anything you'd change?" An answer is feedback (`back`, step 9), so they can steer now.

**Done when** built alone: the person has the link (or the screenshots and the command), the page, the try line, the list of faked parts and the question. In the loop: the screenshots are on `screenshots/pr-<n>` (or only in your report, on a public repo without a yes), the pull request has one comment with their links, nothing new is untracked in your checkout, your report has the links, the branch command, the try line and the faked parts, and your server is stopped.

## Code rules

The owner's preferences. Lint catches some. You follow all of them.

- **Reuse first.** Search for an existing helper, component or util before you write one.
- **Simplest thing that passes.** No new abstraction, layer, factory or generic until a second real use exists.
- **No leftovers:** unused files, exports or dependencies; any `console.*` (use the logger); commented-out code; a TODO without an issue number (`TODO(#42)`).
- **No escape hatches:** `any`, `@ts-ignore`, `@ts-expect-error`, `as unknown as`, `eslint-disable`. If one can't be avoided, add a comment with the reason and an issue number.
- **Size:** warn at 300 lines a file, never over 500. Functions under about 60 lines. Split by responsibility, not by line count.
- **No swallowed errors:** no empty catch, and never drop a caught error. Use the project's one error shape.
- **Comments say why, not what.** Each exported module API gets a one-line doc comment.
- **Names and imports:** kebab-case files, the path alias instead of deep `../../..`, and the project's import order. No barrel `index.ts`: import from the file itself.

## App rules

The shape is in `docs/architecture.md`.

- **Rule of three:** search for an existing component first. Extract a shared one the third time, not before.
- **State:** local `useState` or `useReducer` by default. Anything shareable or refresh-safe (filters, tabs, the selected item, the page) in typed search params. Zustand only for complex shared client state. Server data in TanStack Query, never copied to a store. Forms in TanStack Form, tables in TanStack Table. No props through more than two levels.
- **UI layers:** the route prefetches and passes params; the view is static layout and never fetches; each section is `Suspense` > error boundary > content; components are presentational.
- **Loading, empty and error states** for every dynamic area. Skeletons match the real layout's shape and size. `ErrorState` has an icon, a title, the code's message, a next action and the reference ID. `EmptyState` has an icon or illustration, a sentence and the primary action. Never a bare "Error", a raw `error.message` or a grey box. Queries in parallel.
- **Errors:** `AppError` with a code from the one list. A specific message with a next step for every expected error. A reference ID for the rest. Logged once, at the boundary.
- **Logs:** only through `lib/logger.ts`, never `console.*`. JSON lines with the standard fields, the right level, nothing personal, nothing in a loop.
- **API:** public routes under `/api/v1`. A breaking change adds `/api/v2` beside it, on the same services. Internal server functions aren't versioned. Every public route and webhook is in the OpenAPI document, built from the same Zod schemas.
- **Money:** the `Money` type, integer minor units plus the currency. No float or decimal `number` math. Half-even rounding, remainders allocated, `Intl.NumberFormat` at the edge. Tests for rounding and splitting.
- **Time:** instants in UTC, calendar dates and zoned times kept apart, the injected `now`, no ambiguous parsing, `Intl.DateTimeFormat` at the edge. Daylight saving tests.
- **Database:** Drizzle. snake_case plural tables, a server-made time-sortable `id`, `created_at` and `updated_at`, `<table_singular>_id` foreign keys with an index, `is_`/`has_` booleans, soft delete only where decided, forward-only migrations that are safe to roll out. Audit-log important actions.
- **Env:** read only through `lib/env.ts`. A new variable updates `.env.example`, the schema and the docs in this pull request.
- **Access:** owner filters in the repository, or `check(user, action, object)` through the port. No role checks in code.
- **Text and events:** user-facing strings in the module's `copy.ts` (or its message files, if translation is on). Every event in the registry, sent only by `track()`, with no personal data. Unfinished work behind a flag.

## Never

- Weaken, skip or delete a test to make it pass. That includes tests from earlier slices.
- Change the schema or an API contract unless the issue says to.
- Read, print or commit `.env` files, tokens or keys. Refer to secrets by name. Need a value? Use the `secrets` checklist, never chat.
- Touch another issue's work.
- Add, enable or depend on a GitHub Actions workflow. A tool's docs say "add this workflow"? Run the command it would run from your session instead.

## References

Load a file only when its row fits.

| File | Load when |
|---|---|
| `references/testing.md` | A test is hard to write, or you're unsure what to mock or whether a snapshot fits. |
| `references/code-style.md` | A code rule above is unclear, or you think one should bend here. |
| `references/app-conventions.md` | An app rule above is unclear and `docs/architecture.md` doesn't settle it. |

---

Step 5's loop is based on Matt Pocock's [tdd](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) (MIT).
