# Slicing: how to cut a slice into steps

Load this when you cut a pass into steps, when a step won't pass the thin test, or when the plan checker fails.

## The picture

One slice, "the shared list", in pass 1, cut two ways.

**Cut by layer.** Nothing to try until the last one. Don't do this:

| # | Step | Try it |
|---|---|---|
| 1 | Database schema | nothing yet |
| 2 | List API | nothing yet |
| 3 | List screen | Open /list and use it |

**Cut by what a person can do.** Something new to try after each one:

| # | Step | Try it | Size |
|---|---|---|---|
| 1 | See the list | Open /list: three seeded items show | 4 |
| 2 | Add an item | Type "milk" and press Enter: it shows at the top | 3 |
| 3 | Tick an item off | Click the box next to "milk": it's struck through | 2 |
| 4 | See a flatmate's tick | Tick an item in a second browser: the first one shows it within 5 seconds | 3 |

Each thin step still goes through every layer. Step 1 adds the table, a query, a route and a screen. It does the least that each layer needs for that one thing.

## Seven ways to cut

Take them in order. Stop at the first one that gives steps of size 4 or under.

1. **By verb.** See, add, change and remove are four steps. "Manage items" is not one.
2. **By path.** The plainest way through first, the other ways later. Sign in with Google is a step. Sign in by email link is another.
3. **By rule.** Leave a rule out first, then add one rule per step. "Add an item" first. "No two items with the same name" after.
4. **By data.** One kind of data first. Plain text items first. Items with a quantity after.
5. **By state.** The screen with data first. Then its empty state, its error state and its loading state, each its own step when it's real work.
6. **By screen.** A plain form first. Drag to reorder after.
7. **Plain before nice.** Ask the server every 5 seconds first, live push after. A list first, search and sort after.

**The passes use different cuts.** Pass 1 takes the first two: each verb's plainest path. Pass 2 takes the rules, the kinds of data and the states. Pass 3 takes the nice versions, speed and polish. That's what "a pass is an improvement" looks like, step by step.

## Still too big? The hamburger

1. Write what the step does, in order, as the layers of a burger: *pick a file → send it → store it → show it.*
2. Under each layer, list three or four ways to do it, from crude to good: *paste a link / pick one file / drag in many files.*
3. Take the crudest way in each layer that still works. That bite through the whole burger is the step.
4. Each better way is a later step, often in a later pass.

## What isn't a step

- **A layer:** "the schema", "the API", "the components".
- **Set-up with nothing to see.** It rides in the first step that shows something. Slice 0 is the one exception, and its try line is "it runs locally, then the test URL loads".
- **Tests on their own.** Every step brings its own tests.
- **A refactor on its own.** Cleanup has its place at the pass gate.
- **"Look into X."** An open question goes to `research`.

## When the checker fails

| It says | Do this |
|---|---|
| "is a layer, not a step" | Name the step after what a person does, and cut down through the layers: screen, logic and data in one step. |
| "has no try line", "a developer's check" | Write what the person does on the test site and what they see. Nothing to see? Fold it into the next step that shows something. |
| "size N is above 4 with no reason" | Cut it with the seven ways above. If it truly can't be cut, write why after the number. |
| "N steps for M slices" | You listed slices. Cut each slice by verb, then by path. |
| "pass 1 has no step for the slice" | Pass 1 runs through every slice. Add that slice's plainest path. |
| "steps are above size 4" | More than one step in three is big. Cut the biggest ones first. |

## Thin enough? The numbers

**Before the build,** from the checker's last line:

- 2 or more steps per slice;
- a median size of 3 or under, and nothing above 4 without a reason;
- more than one step that can start once slice 0 is in, so builders can work side by side.

**After the build,** from `node .agents/skills/coordinate/scripts/flow.mjs` at the gate:

- a median pull request of about 200 changed lines or fewer;
- most steps through review in one round;
- hours from pull request to merge, not days;
- no long stretch with nothing merged while the loop was running.

Off on the second list? Cut the next pass thinner.

---

The cuts draw on Mike Cohn's SPIDR, Richard Lawrence's story-splitting patterns and Gojko Adzic's hamburger method. The thin test draws on Bill Wake's INVEST. Sources and dates: `research/agile-flow.md` in the kit.
