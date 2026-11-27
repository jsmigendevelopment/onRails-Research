# Auto grill

The AI grills itself, then the person reviews everything in one sitting. The topics, their order, the floor and the log are the same as the full grill. Only who answers first changes.

**On Full automation** (the level in `kickoff/decisions.md`, or in `docs/stack.md` once the folder has moved), nothing waits on the person. Each step's "On Full" line says what changes. Recommended and Hands-on keep every wait.

## 1. Recommend a high-end run

The self-grill makes every early decision. Before it starts, recommend a stronger model and more effort, in one line, from the "Auto grill" table in `routing`. Ask under `ask_before_strongest` (routing's first rule). Can't switch models in this session? Say so once, carry on with the current model, and record it. On Full, don't ask: carry on with the current model and record it.

**Done when** "Provenance" in `grill-log.md` names the model and effort used, and whether that was the recommended one.

## 2. Ask the seed questions, and nothing else

These four only the person can answer. Ask them in one round, open, with no suggestion (taste, scope and money get the open question first):

1. What is it, in your words? (The pitch from `/idea` step 1 counts. Don't ask it twice.)
2. Who is it for?
3. What is the one core thing it must do?
4. Anything you never want in it?

Log each with the source "person". Ask nothing else before the review. A gap you'd normally ask about becomes a pick with two alternatives. A vague core gets one follow-up: the core is never defaulted.

**On Full, ask nothing.** Answer each seed question from the pitch, source "person (pitch)". One the pitch doesn't answer gets your best guess, source "AI pick, not reviewed". The core too: take it from what the pitch says the app does. Each guess goes first in the FYI (step 4).

**Done when** all four are answered and logged.

## 3. Run the self-grill

Go through every product topic in `grill`, in order, and every item on the floor checklist in `features.md`. For each decision:

- three options with their trade-offs, your pick and a one-line reason;
- the seed answers rule options in or out. A profile or preset answer becomes the pick, and the reason says so;
- the picks it depends on, in the "Depends on" column;
- one row in the "Auto grill" table of `grill-log.md`, source "AI pick" until the review.

**Pick the one-way doors too.** They cost the most to undo, so they get a row now even though `stack` writes them up later:

- the data model: what's stored, and who owns it;
- auth and access: who signs in, and who sees what;
- hosting and the database;
- money and time handling;
- the module boundaries.

Each door's row also says what changing it later would cost. Check every pick against the seed answers, the floor and `docs/architecture.md`'s conventions (money in integer minor units with its currency, instants in UTC). A pick that breaks one is wrong: fix it, and say so at the review.

**Alongside, in the background:**

- the competitor scan (`research`): the MVP topic needs it;
- `wireframes` stage 1 for your picks, with two layouts of the core screen, A and B;
- a shortlist of names (`name` step 2), checked against the competitor scan.

In auto mode, hold the screens and names for the review. Ask nothing about them before it: no per-screen "What would you change?".

**Done when** every topic and floor item has a row with three options, a pick and a reason; the five doors have rows; stage 1 is drawn with two core layouts; and the name shortlist is checked.

## 4. Show the review

Before you show the review, check every one-way door against the seed answers and the conventions again, even when you resume from a drafted log. Fix a door that breaks one, and flag the fix in its block.

Write the review to `kickoff/review.md` (`docs/review.md` once the repo exists) in this exact format, then show the same thing in chat. Three groups, in this order. Every row from step 3 lands in exactly one group.

```markdown
# Review

### Door: <topic, e.g. money and time>
Pick: <the pick only>
Why: <the reason, and any fix you made in step 3>
Alternatives: <the other two>
Cost to change later: <what undoing it would take>
Question: <a question about this door only, e.g. "Confirm integer cents, or which one?">

(one block per one-way door)

## Look and feel

Wireframe layouts A and B side by side (the prototype's `#ids`), the feel, theme, density and voice picks, and the name shortlist with your pick.

## Everything else

| Topic | Pick | Alternatives | Reason |
|---|---|---|---|

Change any row in plain words. "Looks good" accepts the rest.
```

- **Doors never appear in the table** or under "Everything else".
- **Each door's question is about that door alone.** "Looks good" and "accept all" never confirm a door. Each one needs its own yes.

**On Full, nothing waits on the review:**

- End every `Pick:` line and the look-and-feel picks with "AI pick, not reviewed". Set every AI row's source in `grill-log.md`, and every originator in `decisions.md`, to **AI pick, not reviewed**.
- Send one ℹ️ FYI with the link, the seed guesses first: `node .claude/hooks/notify.mjs --level fyi --title "Kickoff review: AI picks, not reviewed" --message "<the guesses>. Change any pick, any time." --link kickoff/review.md`.
- Don't show the review in chat: no `Question:` lines and no "Change any row". Say in one line where it is and that you're going on. Go to step 6.

**Done when** `review.md` has a door block for each of the five doors, the person has answered every door on its own, and they've replied on the table. On Full: `review.md` has the five door blocks, every pick says "AI pick, not reviewed", and the FYI was sent.

## 5. Re-check what a change touches

When the person changes a pick, re-check every pick that depends on it (the "Depends on" column, and anything else it breaks). Redo the ones that no longer fit. Show what moved in a table: Topic · Was · Now · Why. A door that moved needs its own yes again.

**A door changed after the build started** becomes a "Re-plan: <door>" issue that opens with **Cost to change:** (`issues`, "From feedback or bugs"). Put the "What moved" table in it.

**Done when** every pick that depends on a changed one was re-checked, and the "What moved" table is shown. A door changed after the build started: the re-plan issue exists and names its cost.

## 6. Record it

- Set each row's source in `grill-log.md`, and each decision's originator in `decisions.md`, from the labels in `grill`'s "Keep the record".
- Tick the coverage map. Write "Look and feel" in `design.md`.
- Then go back to `/idea`. The name is picked, so `name` starts at its step 3. Stage 2 of `wireframes` draws the picked layout with the agreed look. The wireframe approval gate (`/idea` step 6) still holds, except on Full.

**Done when** every row in the log has a source, and every door has its own confirmation in `decisions.md`. On Full: every door says "AI pick, not reviewed" there instead.
