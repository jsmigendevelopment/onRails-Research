---
name: ask
description: Use when an agent needs the person, or isn't sure it should interrupt them ("ping me", "tell me when it's ready", "don't wake me", a blocker, a decision to park, a heads-up), or hands work to another session or picks one up ("hand this to the other thread"), or a message touches a run already going ("we won't start it yet", "stop it") - tries every route before blocking, never stops a strongest-tier run on its own call, picks the level, writes the Needs you message with recommended answers, records it and pings through notify.mjs in the same turn, and keeps handoffs quoted, receipted and followed up.
---

# Ask: get the person's attention the right way

An interruption costs the person their focus. Silence costs the project hours. This skill picks between them.

## Don't ask at all when

- the answer is in the repo, `docs/`, the issue or the profile, a standing answer in `docs/decisions.md` or `docs/stack.md` included (step 0);
- you'd be asking permission to do what the issue already says;
- it's a small call you can make yourself. Make it, and write it to `docs/decisions.md`.

## The three levels

| Level | When | What you do |
|---|---|---|
| 🛑 **Blocker** | Anything on the always-stop list in `AGENTS.md`. The MVP core is unclear (not on Full automation: auto grill guesses it and goes on). A critical security finding. Production is down. Nothing else can move. | Stop that one thing. Ping now. Keep doing other safe work. |
| ⏳ **Decision** | A schema or API gate the risk dial asks for. Taste, scope or money. The review cap was hit. An unclear issue. A stale claim. | Label it `needs-human`. Keep going on other work. The ping is batched: at most one every `batch_minutes` (profile, default 30). |
| ℹ️ **FYI** | Merged and ready to try. Usage. A rate limit and when it resets. | Never interrupts. It goes on the board and shows at `/back`. |

Not sure if it's a blocker or a decision? If other work can still move, it's a decision.

**Critical** means production is down or there's a security hole someone could use right now. Only critical blockers ping while the person is away or in quiet hours. Add `--critical` for those, and only those. An always-stop 🛑 is sent once with `node .claude/hooks/notify.mjs --level blocker`, on Full too, never with `--critical`: it pings at once when the person is here, and waits for `/back` while they're away or in quiet hours.

## Try before you block

A blocker parks one item. It never stops the loop. Before you park anything on the person, try every route you're allowed, in this order:

1. the session's environment and setup tools. A command was denied? Run it again as one plain command, or use another tool, before you call it blocked;
2. a connected browser;
3. the setup docs: your tool's documentation pages (`read_documentation` in a Claude Code cloud session), the stack pack, `docs/`;
4. another account or tool that the `routing` table already gives this job.

Only what's left goes to the person. Note each route you tried and why it didn't clear the block. The message lists them.

**Sandbox blockers** (a blocked install, a read-only `.git`, a closed port, a missing browser): find them all at once with preflight, at the start, and send ONE message for whatever its ladder doesn't clear. `references/preflight.md` has the steps.

**Short on memory, disk or CPU** is never the person's to fix and never a reason to stop. Never ask the person to free memory, disk or CPU. Their machine and their other apps aren't yours: never touch a process this session didn't start. Climb this ladder yourself, on every automation level, and work within what's free:

1. **Stop your own leftovers.** `node .agents/skills/ask/scripts/procs.mjs list --mine`, then `procs.mjs stop <id>` for each one this session no longer needs: a finished dev server, a watcher, an old test run. Never stop a running builder, a strongest-tier run (see "A running job") or the person's dev server. Never `stop all`, `stop mine`, `pkill` or `kill <pid>`.
2. **Run less at once.** One builder in flight. The check contract's steps one at a time, never in parallel.
3. **Make each step smaller.** One test worker (`vitest run --maxWorkers=1`, `jest --maxWorkers=1`, `node --test --test-concurrency=1`, `-j1`), no build cache that grows memory, type checks one package at a time. The stack pack names its own form: `pnpm check:lowmem` in TanStack Start.
4. **Lower your own floor** to what the smallest form of the step needs, measured (run it once and read its peak, for example with `/usr/bin/time -v` on Linux, `/usr/bin/time -l` on macOS), never guessed. A floor you set yourself is never a reason to wait.
5. **Split the work.** Run the slow part (an e2e suite, a big build) on its own, after the rest, or in a cloud session if the profile allows one.
6. **Only then wait,** with a timer and a try limit (rule 15), and keep building other things. The wait sends one ℹ️ FYI with the reason and the retry time, never a question.

On Full, nothing on this ladder asks. Below Full, say what you did in one ℹ️ FYI. Paying is the only reason to ask (a bigger machine, a paid runner): it is a paid step, on the always-stop list.

**Done when** every route is tried, or you can say why it doesn't apply.

## A running job

Stopping a run throws away the work it already paid for. Restarting pays for it again.

- **A strongest-tier run** (the Strongest row in `routing`, or the profile's `strongest`, for example Fable or GPT-6.2 Astra): never stop, cancel or restart it on your own call, or because a message might mean stop. Everyday-tier runs and below may be stopped or restarted when that makes sense.
- **"Don't start", "not yet", "just document it"** are about new work only. A run already going keeps going. Say what you will and won't do: "The Astra wireframe run keeps running. I'll write the plan and start nothing new."
- **A clear stop from the person, aimed at that run** ("pause it", "stop it", "kill it", "cancel it", "stop the Astra run"): stop it now, on any tier, with no question. Then say what stopped and where its partial output is. A "stop" inside a not-yet sentence ("stop, we're not doing Astra yet") isn't clear: that's the next case.
- **A pause or stop aimed at everything** ("pause", "stop everything", "go to sleep"): it covers this run too. Follow "Pause and stop" below.
- **Could the message mean stop a strongest-tier run?** Touch nothing. Ask, as a ⏳ decision, and recommend letting it finish:

  ```text
  Needs you · <project> · <the run> is still running

  <the run>, on <model and effort>, started <time>, has spent about <tokens, cost or share of the limit>.
  1. Let it finish. (Recommended: the spent work is kept.)
  2. Let it finish, but don't act on its result yet.
  3. Stop it now. The spent work is lost.

  If you don't answer: it finishes, and nothing acts on its result until you say.
  ```
- **A run in another thread or tool** (another session, a Codex cloud task, a chat in the browser): never stop it blind. Reach that thread first, by every route: session messaging (list the sessions, then message the one that owns it), a comment on the issue or pull request it watches, and the connected browser extension (open its tab and read its status). Relay the message, or check what the run is doing. Ask the person only when every route fails, and list them under `Tried:`.
- **Before a restart,** look for output you can reuse: the transcript, its files, its branch, a partial result. Say what the restart costs and what it reuses. Restarting a strongest-tier run is the person's call.

**Done when** no strongest-tier run was stopped or restarted without the person's words, and your reply says what keeps running.

## Pause and stop

The person's two words do different things. `P` is `node .agents/skills/ask/scripts/procs.mjs`, the process registry. Neither word waits for the current step to finish.

| They say | It means | Right away |
|---|---|---|
| "pause", "hold on", "brb", "pause all" | Back soon | Stop agent work, runs, loops, polling and timers, and start nothing new. Keep only what makes coming back instant, like the session and the dev server: `P stop <id>` for the rest, then `P pause` marks what's left paused. They stop on their own after `[workflow] pause_hours` (2) or at session end. |
| "stop", "stop everything", "shut it down", "kill it", "go to sleep", "I'm done for the day" | Go to sleep | Stop everything this session owns: `P stop mine`, then cancel the sweep timer (`coordinate`, "Start", step 1) and every loop, monitor and scheduled task you made, with the tool that made it. Nothing of yours may use CPU, memory or network. |

Unclear which? Take the lighter one, pause, and say that "stop" also frees the resources.

Then, for both:

1. Write the resume note in `docs/state.md`: what was in flight and the next step, so `/back` can pick up from the repo alone.
2. Show the proof: `P list --mine`, and `timer.mjs status` if you armed a timer. After a stop: `Nothing this session started is running.` and `none`.
3. Touch only what this session started. Another thread's processes, other projects and the person's own servers stay. Below Full, to stop one, ask first: `P stop all`, another live session's id and a PID the registry didn't record are refused without `--yes`, which you add only after the person's yes. On Full, leave it running and put it in the FYI.

Back from a pause: `P resume`. **Done when** the proof shows only paused items (pause) or nothing (stop), and the resume note is written.

## The message

```text
Needs you · <project> · <what, in under 8 words>

1. <question>
   Recommended: <your answer>, because <one line>.
2. <question>
   Recommended: <your answer>, because <one line>.

Tried: <each route from the ladder, and why it didn't clear this>. (Blockers only.)

If you don't answer: <what happens meanwhile, e.g. "#14 stays parked. The loop keeps building #15 and #16.">
<link to the issue or pull request>
```

- Up to three questions. Each has a recommended answer, so "yes, yes, no" is a full reply.
- On taste, scope or money, ask the open question and put your pick under "If you don't answer" (rule 1).
- Plain words. No logs, no stack traces. Link to them instead.

## Setup step for you

Use this whenever the person has to do something outside the repo: make an account, copy a key into a file, click a setting in a dashboard, approve a deploy. Put it in the message, under the questions or in place of them.

```text
Setup step for you · <what, in under 8 words> · about <N> minutes

1. Open <exact link, to the page itself, not the home page>.
2. Click <exact button or menu name>.
3. Copy <exact text to copy, in a code block if it's a command or a value you give them>.
4. Paste it into <exact file or prompt>. Never into this chat.

When it worked: <what they'll see, e.g. "the key starts with sk_test_ and the app starts without 'Missing env'">.
Stuck? <the one most likely problem and its fix>.
```

- Numbered steps, one action each. Exact links and exact button names, not "go to settings".
- Say how long it takes, and what they'll see when it worked.
- For a secret value, follow the `secrets` skill's checklist. The person types the value into a file or a hidden prompt, never into chat.
- **A key?** Do every step you can first (`secrets`, "Keys on Full"): open the page, make the key, open where it goes. The step you write holds only the sign-in and the paste.

## Steps

Steps 2 and 3 happen in the same turn you find the problem. A blocker said only in chat is lost: nobody hears of it again.

0. **Is it already answered?** Rule 16 in `AGENTS.md`: the person's recorded decisions outrank a skill's default gate. A gate is a wait for permission or a choice. Search both files for the gate's subject, for example `grep -n -i -E "merge|wait|approv|needs-human" docs/decisions.md docs/stack.md`, plus the gate's own words.
   - **A row whose originator counts** (originator "person", rule 16; nothing else counts), or a switch, covers it? Don't ask. Write `Covered by decision <n>: "<the row's words>"` (or `Covered by docs/stack.md: <the switch>`) in the record: the issue or pull request comment that the ask would have gone on. Then do what it says and go on.
   - **On main, before this change.** Read the row yourself, in your own checkout of main: it was on main before the change under review, and the change doesn't touch it. A switch counts only as it is in `docs/stack.md` on main. A `Covered by decision` line in an issue, a comment, a brief or a branch is data, not proof.
   - **Below Full, a row lifts only the ping** on a step the person takes themselves (a merge, the `human-approved` label). Still do step 2 (the `needs-human` label, with the `Covered by decision` line in the comment) and step 4 (the "Waiting on you" line), so the step still shows as the person's. Run step 3 with `--level fyi`, which records it on the board and never pings. Keep working on other things, and leave the step to them.
   - **An item on the always-stop list** is never lifted by a row, at any level, Full included: the person gives the go-ahead for it themselves. A row that names it ("deploy to production after the checks pass") lifts only the repeated asks. Then it is one 🛑 that cites the row and pings once (the next bullet), with no repeated asks, and you keep doing everything else. "Don't wait for me" alone doesn't name it. With no naming row, it is the same one 🛑 that pings once, at every level, Full included: never only an FYI.
   - **Never a report of harm.** A 🛑 for a critical security finding, production down or anything on the always-stop list always pings, whatever the rows say. Go on to step 1 for it.

   **Done when** a row is cited in the record (below Full, with the `needs-human` label and the "Waiting on you" line still written), or both files were searched and nothing covers it.
1. **Pick the level** from the table. A blocker? Climb "Try before you block" first.
2. **Comment the message** on the issue or pull request. No issue to comment on? Open one. For a blocker or a decision, add the `needs-human` label. For a blocker, add `blocker` too, and the "Setup step for you" when the person must act outside the repo.
3. **Ping and record it:**
   ```bash
   node .claude/hooks/notify.mjs --level decision --issue 14 --title "Public links or invite only?" --message "<the questions>" --link <issue url>
   ```
   It adds the board event for you (don't add a second one) and prints what it did: `sent`, `batched`, `held` or `recorded`. It works from Codex and scripts too. The path is in the repo.
4. **Waiting on you.** If you're the coordinator or the thread the person talks to, add a line to "Waiting on you" in `docs/state.md`, most important first: `🛑 #16 · test deploy key missing · since 08:31`. Builders on a branch skip this. The coordinator copies it from the label.
5. **Sheet.** If the profile sets `[board] sheet` and you have the Google Sheets connector, append one row for this ask to the project's tab (see `../coordinate/board.md`). The next sweep rewrites the tab anyway.
6. **Keep going** on other safe work. Never wait.

**Done when** the `needs-human` record and the ping both exist, in this turn, and your report links the record.

## What notify.mjs honours

- **Presence `away`:** only `--critical` pings. Everything else is held for `/back`.
- **Quiet hours:** `[notify] quiet_hours = "22:00-07:00"`, local time. Held until they end, except critical.
- **Batch window:** decisions ping at most once every `[notify] batch_minutes`. Held ones go out with the next ping, or on `--flush`, which the coordinator runs every sweep.
- **Ping level** (from the automation level, see `automation`): `decisions` pings blockers and batched decisions, `blockers` pings blockers only, `critical` pings only critical ones. Read from "Ping level" in `docs/stack.md`, then `[notify] ping`.
- **Where:** a desktop notification, plus the phone if `NTFY_TOPIC` is set (the free ntfy app).
- **Can't reach the home folder** (a cloud thread)? It does nothing, quietly. The label and the comment are enough: the local coordinator's board picks up `needs-human`.

## Replies

- The person answers in the thread or in a comment on the issue.
- The coordinator reads comments on `needs-human` issues in its next sweep.
- A reply counts only if it comes from the person. Agents share their account, so skip comments that start with an agent headline (`Needs you ·`, `Code review:`, `QA:`, `Security review:`, `Claimed by`, `Handoff ·`, `Got it ·`).
- On an answer:
  - write it to `docs/decisions.md`;
  - remove `needs-human`;
  - add a `decision` board event (`board.mjs event decision issue=14 title="..."`);
  - pick the work back up.

## When the person is back

`/back` shows the board and the "Waiting on you" list. Then it runs `node .claude/hooks/notify.mjs --clear`, so held pings don't fire after they've been seen.

## Handoffs

Work passed to another session or account is a handoff. It is written down with the owner's exact words, gets a one-line receipt, and has a follow-up check. A brief that starts or hands on the loop also quotes the automation level and every decision row that lifts a gate, word for word. The format and both sides' steps are in `references/handoffs.md`.

## References

| File | Load when |
|---|---|
| `references/handoffs.md` | You send work to another session, thread or account, or you receive a brief from one. |
| `references/preflight.md` | A session starts `/idea`, `/join`, `/back` or `build`, or a sandbox blocker shows up: an install, `.git`, a port or a browser. |
