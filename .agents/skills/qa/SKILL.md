---
name: qa
description: Use to check that a change works in a real browser ("test this in the browser", "check the preview", "smoke test the test environment", "is it ready for me to try", or a brief that says use qa) - before merge, runs a pull request's agent acceptance checks on its preview as an independent validator; after merge, smoke-tests the test environment; also tries to read and delete another user's data. Reports pass or files a bug.
---

# QA: prove it works before the person looks

You're independent. Don't read the builder's description. Work from the issue's acceptance checks.

## Modes

**Before merge** (the coordinator's acceptance step):
1. Open the pull request's **preview**. No preview? Check out the branch and run it locally with the dev command in `AGENTS.md`, on a free port, through the process registry (rule 15 in `AGENTS.md`): `node .agents/skills/ask/scripts/procs.mjs start --why "QA of pull request #<n>" --until "the checks are done" -- pnpm dev --port <free> --strictPort`. When step 5 is posted, stop it: `procs.mjs stop <id>`, then `procs.mjs list --mine`.
2. Confirm the local gate ran every `auto` check on the head commit (its `Checks: pass @ <sha>` comment, `coordinate` step 6.1): each `AC-<issue>-<n>` is in a passing test's title.
3. Click through every **`agent`** check yourself, on desktop and phone sizes, the `test-by-hand-as-the-user` way: predictions first, every input moved, a table of what you expected and saw. Watch the browser console for errors.
   - **Force the error and empty states** for each screen the change touches: block the request or make it fail in Playwright, and use a fresh test user with no data. The error state must show an icon, a clear title, the specific message, a next action that works, and the reference ID. The empty state must show an icon or illustration, a sentence and the primary action. A bare "Error", a raw error message or a grey box is a fail.
   - **Watch the load:** the skeleton matches the real layout, and nothing shifts when the data lands.
4. **Try to break access:** as a signed-out visitor, and as a second test user, try to read and delete the first user's data.
5. Post one comment. The first line is `QA: pass @ <commit sha>` or `QA: fail @ <commit sha>`. Then one line per acceptance check, by ID: `AC-12-3: pass` or `AC-12-3: fail · <what you saw>`, plus one line each for access and for the error and empty states, and the hand-test table. Add a board event: `node .agents/skills/coordinate/scripts/board.mjs event review pr=<n> verdict="QA: pass @ <sha>"`.
6. **Another user's data was readable or deletable?** That's a critical security finding: a 🛑 blocker through the `ask` skill, as well as a fail.

**Smoke** (after a merge):
1. Open the **test environment** (the URL is in `AGENTS.md`), never production.
2. Run the main flow from `docs/vision.md`, plus the merged issue's `agent` checks, by hand as in `test-by-hand-as-the-user`, and report them by ID.
3. Pass: tell the person "ready to try". Lead with the issue's try line, so they know what to do and what they'll see. Then what you tested, and 1–3 screenshots. That's an ℹ️ FYI: `node .claude/hooks/notify.mjs --level fyi --title "Ready to try: <issue title>" --message "<the try line>" --link <test URL>`. Fail: open a bug issue with the steps, expected, actual, a screenshot, and the PR it came from.

## Rules

- **Playwright first,** always. It runs headless, in the agent's sandbox or a container, and doesn't use the person's machine.
- **The person's own browser second,** and only after Playwright passes: for example Claude in Chrome, which tests the way they're actually signed in. It's a final look, not the main test. Skip it if it isn't connected. Ask first, and name the site and the account (`test-by-hand-as-the-user`, step 1).
- Use test accounts and test data only. Never real personal data or payment details.
- If a failure might be your mistake rather than the app's, say so and show the evidence.
