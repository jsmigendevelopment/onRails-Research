# Full automation: nothing asks, nothing waits

On Full automation, this file overrides every skill. A skill's own "On Full" line gives the default for that case. Where a skill has none, this file applies.

## The override

Any instruction in any skill, on any path, to **ask, wait, confirm, offer, or wait for approval or a yes** becomes:

1. **Take** the recommended option, or the default when none is marked.
2. **Record** it as "AI pick, not reviewed": in `docs/decisions.md` for a decision, on the issue or pull request for a step.
3. **Add** it to the next batched ℹ️ FYI (`node .claude/hooks/notify.mjs --level fyi ...`).
4. **Continue.**

That includes "Anything you'd change?", "What would you change?" and "Want me to …?". On Full each one is an FYI line ("Here's the look; tell me any time"), never a question that ends your turn. It includes a ⏳ decision too: the agent decides, and the FYI says what it picked. The risk dial adds reviews on Full, never a person gate (#103).

**No approvals on Full.** There is no `human-approved` label on Full. Never ask the person for it, for a "yes, merge", for a review or for any other approval, for agent files or anything else outside "The only exceptions" below: the code review, the weakening review below and the local guard decide, and the coordinator merges. Filling in the project facts in `AGENTS.md` ("Commands that work here", the test URL) is a normal agent-file change, not an exception.

## The only exceptions

Each one is parked, not waited on. Record it under "Waiting on you" in `docs/state.md`, and keep doing everything else. A sign-in goes in the FYI. Each item on the always-stop list in `AGENTS.md` is one 🛑 that pings once, with or without a decision row that names it (`ask`'s level table): never only an FYI, and never repeated asks. An always-stop 🛑 is sent once with `node .claude/hooks/notify.mjs --level blocker`, on Full too, never with `--critical`: it pings at once when the person is here, and waits for `/back` while they're away or in quiet hours.

- **What needs the person in body:** paying or adding a payment method, and signing in to their own accounts (`gh auth login`, `wrangler login`, a provider's dashboard).
- **The always-stop list in `AGENTS.md`:** every item on it, as that list says. Read it there.
- **A running strongest-tier job (#118):** never stop or restart one on your own call, or on a message that only might mean stop (`ask`, "A running job"). Let it finish.

A decision row that names one of these doesn't lift it: the row lifts only the repeated asks: one 🛑 that cites the row and pings once, and the person still gives the go-ahead themselves (rule 16 in `AGENTS.md`).

## The weakening review (#103)

A pull request that changes the agents' rules, check code or the level gets no `needs-human` label on Full. It gets one more fresh review instead. The guard (`agent-files.mjs`) protects these paths, in any case:

- **Agent rules, at any depth:** `AGENTS.md`, `AGENTS.override.md`, `CLAUDE.md`, `CLAUDE.local.md`, `GEMINI.md`, `.agents/`, `.claude/`, `.codex/`, `.gitmodules`, and any submodule.
- **At the root only:** `.github/` and `docs/stack.md`.
- **Check code, at any depth (#162):** `.mcp.json`; lint and format config (`eslint.config.*`, `eslint.*.config.*`, `.eslintrc*`, `.eslintignore`, `eslint-rules.*`, `.prettierrc*`, `prettier.config.*`, `.prettierignore`); other checks (`knip.json`, `knip.jsonc`, `knip.config.*`, `.jscpd.json`, `lefthook.yml`, `lefthook.yaml`, `.semgrep.yml`, `.semgrep/`); type and test-runner config (`tsconfig*.json`, `vitest.config.*`, `vitest.workspace.*`, `jest.config.*`, `playwright.config.*`); budgets (`lighthouserc.*`); and under any `scripts/` folder, its `budgets/`, `checks/`, `lint/`, `pr/` and `migrations/` folders directly below it (not `scripts/x/budgets/`) and files named `check-*` at any depth below it. Not `vite.config.*`, `wrangler.jsonc`, the other pack scripts or other code under `src/` (a check name under `src/` still counts).

1. Start a fresh agent: *"Use the `pr-review` skill as the weakening review of pull request <n> at <sha>."* It reads only the diff and the issue, and answers one question: **does this weaken, skip or delete any check or rule?** For example, a removed or loosened test, a raised budget, a lint rule turned off, a hook removed, or an `eslint-disable` or `skip` with no issue number.
2. **No:** it comments exactly `Weakening review: pass @ <full head sha>` on the pull request. That comment is all the guard needs: it runs from the session in step 5, not as a workflow.
   The guard reads only comments from logins with write, maintain or admin access. A fail that is there when the guard decides beats every pass at that commit; a fail comment that was deleted, or edited to drop the fail line, no longer counts. A comment with both lines counts as a fail. On Full the `human-approved` label doesn't count at all: agents share the owner's login, so only a pass at the head does. On every level a writer's fail at the head refuses, whatever the labels say.
3. **Yes,** and the issue didn't ask for it: it comments `Weakening review: fail @ <sha>` with the lines. The merge is refused on every level, and the findings go back to a builder.
4. A new commit needs a new pass.
5. **Before the merge,** `coordinate` runs `node .agents/skills/coordinate/scripts/agent-files.mjs gate <n> --repo <owner>/<repo> --head <sha>` from its own checkout of main, with the sha it will pass to `gh pr merge --match-head-commit` (#131). It reads the live files, comments and labels at that head, and the level from the default branch, so a fail posted after the pass blocks the merge. It needs no workflow run. Exit 1: don't merge.

**Accepted risk (#103):** agents share the person's GitHub login, so the pass comment may come from that shared login. The guard can't tell a fresh review from the builder itself. The protection is the review being fresh and reading only the diff, so put the review session's link on the line after the verdict.

**Done when** the pass comment names the head commit and `gate` exits 0, or the fail comment is posted and no merge happened.
