---
name: writing-for-agents
description: Use when writing or editing anything an agent reads ("write a skill", "edit this skill", "update AGENTS.md", "this skill doesn't fire", "make this prompt shorter") - a skill, AGENTS.md, a reference file or an issue body. Blunt short sentences, a description that triggers, steps that end on a clear "done when", a skill or a reference file or neither, cutting lines that change nothing, and editing in .agents/skills, then syncing.
---

# Writing for agents

An agent reads every word, every run. Each line you add takes attention from the others. Write less, and make every line change what the agent does.

## The voice

- **Blunt.** Say what to do: "Run `check`." Not "you may want to consider running the checks".
- **Short sentences.** One idea each.
- **Plain words,** about 8th-grade level. Explain a technical term in plain words the first time.
- **Say what to do, not what to avoid.** "Write one-line comments" works better than "don't write long comments": naming the banned thing puts it in the agent's head. Keep "Never" for hard lines, like the always-stop list, and pair it with what to do instead.
- **No hype, no filler.** A number, or nothing.
- **No private names, secrets or one repo's paths** in a kit skill. Write for the kind of task, not the one run you learned it from.

## A description that triggers

The description is the only part of a skill loaded every session. Its words decide when the skill fires.

- Start with "Use when" and the job.
- Then, in quotes, the words people really say: `("debug this", "it's broken")`. One phrase per distinct case. Three ways to say the same case is one case.
- Then, after ` - `, what the skill does, as a short run of verbs.
- Use the words the person, the issues and the other skills already use. Shared words make it fire.
- Keep it under about 80 words.
- A skill that doesn't fire? Fix the description's words first. Copying the skill into `AGENTS.md` is the last resort.

## Steps that end on "done when"

- Number the steps in the order the agent does them.
- End each hard step with **Done when** and something the agent can check: a command passed, a file exists, every item on a list is covered. "Understand the code" can't be checked, so the agent stops early.
- Set the bar high where it matters. "Every acceptance check has a test" gets more work than "write tests".
- One word per idea, used every time. Pick a word the model already knows (red, green, tight, fence, tracer bullet) before you invent one.

## A skill, a reference file, or neither

| Put it in | When |
|---|---|
| `AGENTS.md` | Every session needs it. Rules and pointers only. Each line costs every session. |
| A skill | A job with steps that a person asks for in words, or that another skill or an issue's `Skills:` line names. |
| A reference file (`references/<name>.md` in the skill, or a `guide/` page) | Detail only some runs need: a long table, a recipe, the reasons. Give it a row in the skill's **References** table: the file, then "load when …". A `guide/` page gets its row in `guide/README.md`. |
| Neither | The model already does it, or the repo already says it (`package.json` scripts, config, `--help`). Point to the source. |

- **Make a new skill only** when it has its own trigger words, or another skill must name it. Otherwise add a step or a reference file to a skill that exists. Each skill adds a description to every session.
- In a skill, keep what every run needs. Move out what only some cases need.
- Each fact lives in one place. Link to it. A copy goes stale.

## Cut what changes nothing

Read each sentence and ask: if I delete it, does the agent act any differently? No? Delete the whole sentence, not a few words. Typical ones: "be careful", "write good code", explaining what the model already knows. Cut stale lines too: a renamed file, a step nobody runs. A document gets better as it gets shorter.

## Edit in `.agents/skills`, then sync

`.agents/skills/<name>/` is the master. `.claude/skills/` is a copy. Never edit the copy.

- **In the kit repo:** run `node scripts/sync-skills.mjs`, then `cd cli && npm run bundle && npm test`. Commit both copies and `plugin/`. Then `node scripts/sync-skills.mjs --check` must pass, run from the session before the pull request. `CONTRIBUTING.md` has the rest.
- **In an app:** copy `.agents/skills` over `.claude/skills`. `npx onrails doctor` checks that they match, and `doctor --fix` copies them. A change to `AGENTS.md`, `.agents/` or `.claude/` gets the weakening review, and below Full the person's `human-approved` label too (`coordinate`, Rules).
- **Fixed a kit skill inside an app?** The kit should get the fix too. Draft an issue for the kit (see "Retro" in `back`).
- **A new skill in the kit:** add it to the skills list in `AGENTS.md`, the skill count and table in `README.md`, the cheat sheet if a person might type it, and a `CHANGELOG.md` line.

## Test it

Start a fresh session. Say a trigger phrase and watch. Did it fire? Did it do every step? Fix the words that failed, not the ones that only look long.

---

Based on Matt Pocock's [writing-for-agents](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-for-agents) (MIT).
