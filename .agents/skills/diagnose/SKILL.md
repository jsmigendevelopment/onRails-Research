---
name: diagnose
description: Use when something is broken, failing or slow and the cause isn't known yet ("debug this", "it's broken", "why is X failing", "this test keeps failing", "it's slow", "it got slower") - gets a check that goes red on the bug before any theory, shrinks it, ranks three to five guesses that can be proved wrong, probes one at a time, fixes it with that check as the regression test, and cleans up. Stays inside the issue's fence. A bug in production is a blocker and never touches production without asking.
---

# Diagnose: no theory until it goes red

Reading code and guessing is the default, and it's the trap. First build a check that goes **red** on this bug. After that, finding the cause is routine.

An easy question with a clear answer? Just answer it. This skill is for bugs you can't solve at first look: a flaky test, a regression, a symptom with no obvious cause.

## Before you start

- **Bug in production?** That's a 🛑 blocker. Use the `ask` skill and ping now. Never touch production to reproduce or fix it: no real data, settings, secrets, deploys or extra logging there without the person's yes. Reproduce on your machine or the test environment, with test data.
- **Which issue?** Work from a bug issue on a `fix/<n>-<short-name>` branch. No issue yet? Write one first with the `issues` skill: the steps, what was expected, what happened.
- **Redact.** Before you show output, a log or a captured request, replace every token, key, cookie and email with `<REDACTED>`. Quote only the lines that matter. Not enough left to work with? Say so and ask.

## Steps

1. **Get a red check.** One command you have already run, that goes red on the person's exact symptom. Try these in order:
   1. a failing test at the nearest seam (the public interface the bug passes through), run with `test`, or `test:e2e` for a flow;
   2. a script: `curl` against the dev server, or the CLI with a saved input, compared with known-good output;
   3. a browser repro: the `qa` skill's Playwright setup, asserting on the page, the console or the network;
   4. a captured request or event (redacted), replayed through the code path;
   5. "sometimes wrong": run it 100 times, or with random inputs. "It worked last week": hand the check to `git bisect run`;
   6. last resort: a script that tells the person what to click and records what they saw.

   Make it **tight**: seconds, not minutes; the same result every run; it asserts the symptom, not "didn't crash"; it runs without the person. For a flaky bug, raise the hit rate (repeat it, run it in parallel, add load) until it fails often enough to work with.

   Looking at it in a browser by hand, before the red check or after the fix? Load `test-by-hand-as-the-user`, and turn what you saw into the red check.

   **Done when** you can show the command and its red output. Can't get one? Stop. Say what you tried, and ask for access to where it happens, a redacted capture (a log, a HAR file, a screen recording), or a yes for temporary logging on test. No red check, no step 2.

2. **Confirm, then shrink.** Check it's the person's bug, not a different one nearby. Then cut inputs, steps, data and config one at a time, and rerun after each cut. **Done when** removing anything else turns it green.

3. **List three to five guesses,** most likely first. Each one makes a prediction: "If X is the cause, changing Y makes it go away." No prediction, no guess. Post the list on the issue for the person. Don't wait for an answer: they may know at once which is right, but if they're away, test in your own order.

4. **Probe one guess at a time.** Change one thing per run. A debugger beats logs. If you add logs, tag each one `[DEBUG-<4 random letters>]` so one search finds them all later.
   - **Slow, not broken?** Logs won't show it. Measure first: a timing baseline, a profiler, or the database's query plan. Then bisect. Write down the number before and after.

5. **Fix it, test first.** This is `build`'s red, green, refactor loop, step 5.
   1. Turn the shrunk repro into a test at a seam that runs the real bug path. Name it for the bug. Watch it fail.
   2. Fix the cause, with the least code. Watch the test pass.
   3. Tidy, with every test still green. Then rerun the step 1 check on the original, unshrunk case.

   No seam reaches the real bug path? Don't write a shallow test that passes anyway. Say so in the pull request, and open an issue for the missing seam. A slow bug gets a test with a time budget if timing is stable, or the before and after numbers otherwise.

6. **Clean up and hand off.** **Done when:**
   - the step 1 check and the new test both pass;
   - a search for `[DEBUG-` finds nothing, and every throwaway script is gone;
   - `check` passes, and `test:e2e` too if the bug was in a flow;
   - the pull request says `Closes #<n>` and which guess was right, with the numbers for a slow bug.

   Then finish with `build`, from step 9.

## Stay inside the fence

Fix this bug and nothing else. Found another bug, a refactor or a missing seam on the way? Open a new issue with the `issues` skill. Never weaken a test to get to green (rule 7 in `AGENTS.md`).

---

Based on Matt Pocock's [diagnosing-bugs](https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnosing-bugs) (MIT).
