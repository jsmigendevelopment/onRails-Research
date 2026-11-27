# Handoffs: written down, quoted, receipted, followed up

A handoff is work one session passes to another: a builder brief, a prompt for another account, "tell the other thread to …". A handoff said only in chat gets read differently, or lost. So every handoff is a written record, and both sides check it.

## The sender

1. **Write it down** as an issue, or a comment on the current one. Label the issue `handoff`. Use this shape:

   ```text
   Handoff · <from session> → <to session or account> · check by <time, UTC>

   Owner's words: "<what the person said, copied exactly, in quotes>"
   My summary: <one line: what to do>
   Why: <one line>
   Done means: <what the receiver hands back: a pull request, an answer, a needs-human record>
   ```

   - Copy the owner's words. Never paraphrase them. Your summary goes next to them, never in their place.
   - No owner's words (the loop picked a ready issue)? The issue is the record. Write `Owner's words: the issue body`.
   - The coordinator's `Claimed by` comment is the record for a builder brief (`coordinate`, step 4).
   - **Starting or handing on the loop** (a coordinator in another thread, a sub-agent, another account)? The brief and the record add the standing answers, copied word for word, so the receiver never asks what they settle (rule 16 in `AGENTS.md`):

     ```text
     Automation level: <the "Automation level" section's Level line from docs/stack.md, and each switch that differs from the level's default>
     Standing decisions: <every row the person made (originator "person", rule 16) that lifts a gate or says not to wait, copied whole with its number>
     ```

     None? Write `Standing decisions: none`. A summary like "on Full, don't wait" doesn't count: the receiver can't check it against the files.
2. **Schedule the follow-up check** for the "check by" time. Use the session's scheduling tool where one exists (in a Claude Code cloud session, `send_later`). Otherwise the coordinator's sweep checks it (`coordinate`, step 10). Say which in the record: `Follow-up: send_later` or `Follow-up: coordinator sweep`.
3. **At the follow-up,** read the record. Done, or blocked and recorded as `needs-human`? Close it out. Anything else (no receipt, no result, no record) is a ⏳ decision through `ask`: tell the person what was handed off, to whom, and what's missing.

**Done when** the record exists with the owner's exact words (and, for the loop, the level and the standing decisions) and the follow-up is scheduled.

## The receiver

1. **Reply with a receipt** on the record before any work, in one line:

   ```text
   Got it · <your session> · My reading: <the request, in your words, in one line>
   ```

2. **Compare your reading with the owner's words,** not with the sender's summary. Does it differ, or could the words mean two things? Below Full, ask the owner before you start. It's a ⏳ decision through `ask`: quote the words, give each reading, and recommend one. Start nothing on it until they answer. Other work keeps going. On Full, start on the reading you recommend, record it as "AI pick, not reviewed" and put the other readings in the FYI.
3. **Blocked?** Climb "Try before you block" in `ask`. What's left is a `needs-human` record and a ping, in the same turn. Link it on the handoff record.
4. **Finish** with a comment on the record: what you did, and the link to the pull request or the answer.

**Done when** the receipt is on the record, and the work is done, asked about, or parked as `needs-human`.

## The orphan sweep

`/back` and the coordinator's sweep list:

- every open `needs-human` item;
- every handoff record (a `Handoff ·` or `Claimed by` comment) with no `Got it ·` receipt after it, or past its "check by" time with no result;
- every claimed issue with no new commit for 2 hours (a stale claim).

Each one is a ⏳ decision, unless it's already on the "Waiting on you" list.
