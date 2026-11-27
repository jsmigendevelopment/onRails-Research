---
name: back
description: Use when the person starts or returns to work in a repo that uses this workflow ("I'm back", "back", "good morning", "start of day", "new session", "pick up where we left off", "what's going on", "what happened overnight") - in a fresh thread or an old one. Rebuilds the picture from the repo and GitHub, reports what changed since /afk sized to the time away, checks who else is working, resumes a paused kickoff, runs a short retro after a long run, and asks how to triage, or on Full picks it and starts the loop again.
---

# /back: pick up where things left off

Works the same in a brand-new thread or one that's been running all night. **Rebuild from the repo, not from memory.** A long or compacted thread forgets rules and details.

**On Full automation, ask nothing here:** every step that asks or offers has its own "On Full" branch: follow it, say your pick in the report, and go on. The last step starts the loop again (`automation`'s `references/full.md`).

## Steps

**Preflight first:** `node .agents/skills/ask/scripts/preflight.mjs --if-changed --record`. When `docs/state.md` says `Environment: ok` and the sandbox hasn't changed, it skips the slow probes and says so. Otherwise it prints one table: follow `../ask/references/preflight.md` for every `✗` row, and put what's left in the report's "Waiting on you", as ONE item.
- **Not marked read on this machine** (the line under the table says so: a fresh clone, a copy, or a worktree not marked itself yet)? Look at what the repo would run first: `package.json` scripts, `.npmrc`, yarn config, `.git/config`, `.git/hooks` and any committed `node_modules`. Nothing odd: `node .agents/skills/ask/scripts/preflight.mjs --mark-read` in the repo's top folder, then preflight again. Below Full, mark it only once the person has confirmed what you looked at, as `/join` does; on Full, mark it with no wait. Something odd: don't mark it. Below Full, ask the person about it; on Full, list it in the report and the FYI, and go on unmarked.

0. **Mark yourself here.** If the profile sets `[board] sheet` and you have the Google Sheets connector, read the Presence tab first and note whether it's a stale away (see "The Presence tab" in `../coordinate/board.md`). Run `node .agents/skills/afk/scripts/worklog.mjs presence back`. It prints JSON. Then write the Presence tab, so it says `here` everywhere. `staleAway` true, or a stale tab? Say in the report: *"An /afk from <since> was never ended, so the loop treated you as unknown."* **Only if `justReturned` is true** (they're back from an `/afk` and no other thread has said so yet), tell the other threads, using your tool's way to list and message the other sessions running on this machine (in Claude Code: `ListAgents`, then `SendMessage` to each one). Skip any that can't be reached, and don't wait for replies. Cloud threads only get it if they're connected to this machine: *"<person> is back. Return to normal rules: ask instead of parking."* Then run `worklog.mjs presence announced`. A `/back` without an `/afk` before it tells nobody. To answer "how many hours did I work", run `worklog.mjs report` (add `--days 30` or `--all`). If the profile sets `[worklog] sheet` and you have the Google Sheets connector, copy the new entries to that sheet: run `worklog.mjs pending`, append each line as a row (time, project, event, machine, branch, note), then run `worklog.mjs pending --mark`. This is how cloud sessions keep their hours, because their local log disappears with the container.

1. **Read the board first.** Run `node .agents/skills/coordinate/scripts/board.mjs render --print`. It shows what needs the person, what's being built and in review, what merged today, and the FYIs, from every thread on this machine. If the profile sets `[board] sheet` and you have the Google Sheets connector, rewrite the project's tab once (see `../coordinate/board.md`). No sheet set and you have the connector? Below Full, offer one, once. On Full, say in the FYI that one can be set.

2. **Read the state.** Read `docs/state.md`, and if it exists, the `/afk` section in it: when the person left, the commit on main, the queue and the rules set.
   - **Close the `/afk` section** before triage: add `Ended by /back at <time, UTC>` to it. The loop then merges by normal rules again, and a hard stop that passed no longer holds it. A retro already in that section counts for step 7.
   - Read the pass status in `docs/pyramid.md`. A pass at `gate`? Load `../pyramid/references/pass-gate.md`. The loop has been doing its audit and cleanup. The person's part, trying it and the re-plan, is the first triage option. The MVP's last pass done and production still "Coming soon"? Say: *"MVP complete; launch is your call."* Never start the launch yourself.
   - List stale research: `node .agents/skills/research/scripts/check-research.mjs docs/research --stale`.
   - No `docs/state.md`, but a `grill-log.md` in `kickoff/` or `docs/`? A paused kickoff. Resume `/idea` at the first line its coverage map hasn't ticked.

3. **Check GitHub** with `gh` or your tool's GitHub access:
   - what merged since then;
   - open pull requests and their verdict comments;
   - claimed issues;
   - **the orphan sweep:** every open `needs-human` item, every `handoff` record with no `Got it ·` receipt or past its "check by" time, and every stale claim (over 2 hours with no new commits). List each one under "Waiting on you", even if nothing else mentions it (`../ask/references/handoffs.md`);
   - whether main's checks are green: the `Main's checks:` line in `docs/state.md` says `Checks: pass @` main's current full sha. Missing, older or a fail? Say so in the report;
   - **the sweep timer:** `node .agents/skills/coordinate/scripts/timer.mjs should-arm`. Exit 1: a live timer, maybe another session's; leave it. Exit 0 (none, or dead) while the loop should run (not Hands-on, work left)? Say so. On Full, step 11 starts the loop again.

4. **Who else is working?** Look for claims and branches from sessions that weren't yours, and the board's other threads. Below Full, then ask: *"Is anyone else, or any other agent, working on this repo right now?"* On Full, don't ask: state what you found in the report (*"No other sessions: no claims or branches but mine"*, or each one). Record it in `state.md`.

5. **Usage.** If the person uses Claude Code, check what's left (see "Checking usage" in `afk`) and report the percentage used and when it resets. The profile has `[accounts]`? Report each account: usage and reset where you can see it, and its waiting work (jobs held at its limit, and ready-to-paste prompts not yet started).

6. **Report, sized to the time away.** After a short break, 3 lines. After a night, at most 10 lines: counts plus the top three in each, with links to the rest.
   - **To try:** the "To try" list in `docs/state.md`, newest first: what to do and what they'll see, with the test link.
   - **Merged:** split into *checked and passed*, *checked and failed*, and *not checked yet*, with test links.
   - **Failed or parked,** and why.
   - **Waiting on you,** most important first: 🛑 blockers, then ⏳ decisions, each with its recommended answer, from the board and the "Waiting on you" list in `docs/state.md`. Then run `node .claude/hooks/notify.mjs --clear`, so held pings don't fire now that they've been seen.
   - **FYI:** ready to try, usage, rate limits, and stale research dossiers, each with its re-check date. Below Full, offer to re-check one before a decision leans on it. On Full, list it, and re-check it before a decision leans on it.
   - **Usage** used, and when it resets. Per account, if there's more than one, with its waiting work.
   - **Still running:** `node .agents/skills/ask/scripts/procs.mjs list`. Back from a pause in this session? `procs.mjs resume`. A stale one (its owner session is gone, or past its time or its pause) was started by onRails: stop it with `procs.mjs stop stale` and say so.
   - **Anyone else** who touched the repo.

7. **Retro, after a long run.** The person was away for the night or longer, or the loop merged or parked 5 or more issues since the last retro? Run the retro below, unless the `/afk` section in `docs/state.md` already has one for this run. Then show its findings in the report.

8. **Triage.** Below Full, offer three options with your pick first, and wait for their choice. On Full, it's a report line, not a question: *"Next: <your pick>. The loop goes on."* The options:
   - a pass at `gate`: try it, then re-plan the next pass (the right pick then);
   - try what's on "To try", riskiest first (usually the right pick otherwise);
   - clear the `needs-human` list;
   - start or keep running `coordinate`.

   Below Full, offer to start the dev server too, so they can try things locally (`build`, "Show it"). On Full, put the command that starts it in the report.

   On Full and the app now has real users? Suggest switching to Recommended (the `automation` skill) in the FYI.

9. **Feedback becomes issues or ideas.** As the person tries things, sort each point. Something wrong or slow in what's built: open `issues` and write one issue for it, and the loop builds the fix in the current pass (labelled `gate` while a gate runs). Something missing is a new idea: add a row to `docs/features.md`, and the next re-plan places it. Don't fix things inline unless they're tiny. Take a line off "To try" once they've tried it.

10. **Before the session ends,** not before step 11 (a loop that step starts keeps running), stop what you started (`procs.mjs stop mine`, then its list is empty), and update `docs/state.md`. Overwrite it, keep it under 30 lines, and leave it so a brand-new session could take over.

11. **On Full, start the loop again.** Work left (a ready issue, an open pull request, a retro issue from step 7) and the person hasn't said pause or stop? Start `coordinate` now, as the last thing `/back` does: it cancels a dead timer and arms one (`coordinate`, "Start", step 1). `timer.mjs should-arm` exits 1? A live loop runs already: leave it. Add *"Loop restarted"* or *"Loop already running"* as the report's last line. Below Full, the loop starts when the person picks it in step 8. **Done when** the timer is armed or a live loop was found, or the report says why not (no work left, or the person said pause or stop).

## Retro

A short look back, so the next run goes better. `/afk` runs it at the hard stop too.

1. **Read the record, not your memory:** the board, `docs/state.md`, the merged and parked issues, failed checks, rejected reviews and `needs-human` items since the last retro. Add the flow numbers: `gh pr list --state merged --limit 200 --json number,createdAt,mergedAt,additions,deletions,headRefName > <tmp>/merged.json`, then `node .agents/skills/coordinate/scripts/flow.mjs --github <tmp>/merged.json`.
2. **Ask three questions:**
   - **What went wrong?** A failed check, a rejected review, a parked issue, a bug that reached test.
   - **What was slow?** An issue that took many rounds, a long hunt for a file or a fact, a wait on a limit. In the flow numbers: the longest gap between merges and what caused it, and the slowest pull requests.
   - **What did the person do by hand?** A setup step, a fix, a command, an answer the docs should have had.
3. **Keep at most 5 findings,** worst first. Each one names where it happened: an issue, a pull request or a commit. Drop any you can't point to. A finding is not a feature request.
4. **Pick the fix that fails loudly.** A mistake a tool could catch gets a check (a lint rule, a test, a step in `check`), not a new line in `AGENTS.md`. A missing fact gets a pointer from a file the agent already reads.
5. **Each finding becomes an issue:**
   - **A problem in this app** (its code, tests, docs, checks or setup): open an issue here with the `issues` skill. Below Full, don't add `status:ready`: the person picks it. On Full, add `status:ready` and a priority, so the loop builds it.
   - **A flaw in the kit itself** (a skill step that's wrong or missing, a script, a hook, a template): draft an issue for the kit's repo, `jsmigendevelopment/onRails`. Title, what happened, where in the run, and the fix you suggest. Leave out app code, secrets and private names. Below Full, put the draft under "Retro" in `docs/state.md` and show it to the person. **Never file it there without their yes.** On a yes: `gh issue create --repo jsmigendevelopment/onRails`. On Full, file it now with that command and link it under "Retro"; no `gh`, or it fails? Keep the draft there and list it in the FYI, never as waiting on the person.
6. **Write it down.** Add a "Retro" section to `docs/state.md`: the date, one line per finding with its issue link or "draft for the kit". **Done when** every finding has an issue or a draft, and the section is written.

---

The retro is based on Matt Pocock's [retro](https://github.com/mattpocock/skills/tree/main/skills/engineering/retro) (MIT).
