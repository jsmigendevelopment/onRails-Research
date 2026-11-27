---
name: research
description: Use when a decision is crucial, uncertain and expensive to undo and nobody knows the best answer ("we need to research this", "deep research", "research this properly", "dig into X", "which library should we use", "is this even possible") - runs a focused research thread on the strongest model, compares at least three options against evidence, fact-checks it in a fresh session, writes a dated dossier with its sources, provenance and a re-check date into docs/research/, and captures it to the person's private research library as a pull request.
---

# Research: don't guess on the decisions that matter

AI tends to find *a* solution and run with it. For the few decisions that shape the whole app, research the options first.

## When

Use it only when **all three** are true:
- the decision is **crucial**;
- nobody **knows** the best answer;
- it's **expensive to undo**.

Everything else gets three options with trade-offs and a recommendation, decided in the conversation.

## How

1. **Check what's known.** Read `docs/research/README.md`, the index, and the person's research library if they have one. Don't redo a `current` dossier.
2. **Run it in its own thread** on the strongest model at high effort (see `routing`). Commit its brief first: the question, the constraints from `docs/vision.md` and `docs/stack.md`, and what "good" means for this app.
3. **Write the dossier** to `docs/research/<topic>.md` from the `idea` skill's `templates/research.md`, with its store in `docs/research/<topic>/` (`references/desk-research.md`): at least three options, every claim labelled, a recommendation with its confidence, and what would change the answer.
4. **Record provenance** in `docs/research/<topic>/provenance.json`: the exact model ID, effort, harness, dates and brief for every role (`references/provenance.md`). `unknown` when the session doesn't show it. Never guess.
5. **Fact-check before anyone acts on it.** A fresh session, on another model if you have one, checks every claim and writes `fact-check.csv`. Each finding gets fixed, disputed or accepted, with a reason. Until then the dossier is `draft`.
6. **Add its row to the index:** the question, the decision it fed, the date, the status, the re-check date and the author's model and effort.
7. **Check it:** `node .agents/skills/research/scripts/check-research.mjs docs/research/`. Done when it passes.
8. **Commit with the trailers** `Research-Model: <exact ID>` and `Research-Effort: <effort or unknown>`, in the commit and the pull request.
9. **Capture it to the library.** Every run of this skill, every research on the strongest tier, and every "deep research", "research properly" or "dig into" is captured. A quick lookup (a version, a doc link) isn't. Follow `references/library.md`:
   - `[research] library` set in the personal profile (`~/.onrails/profile.toml`, never `docs/profile.toml`): check that the repo is private and refuse a public one, read its `research-library.json`, write the entry where it says, run its checks, and open a pull request. Don't ask.
   - No library and `offered = false`: offer once to make a private one. Record the answer, so you never offer again.
   - **On Full automation, skip this step:** no offer, no capture, `offered` left unset. Step 10's FYI says the dossier wasn't saved to a library.

   Done when the library's checks pass and the pull request is open, or the refusal or the "no" is recorded.
10. **Bring back the recommendation, not the whole dossier.** The person decides. The decision goes into `docs/decisions.md` with a link to the dossier.
   - **On Full automation,** step 2 runs on the current model, with no ask. The CTO decides from the dossier, records it as "AI pick, not reviewed" with the link, and sends an ℹ️ FYI: the decision, the dossier's path, and that it wasn't saved to a library.

## Rules

- Write "not found in N searches", never "doesn't exist."
- Date everything. A dossier says when to re-check it: 6 months at most, 3 or fewer when prices, betas or fast-moving tools drive the answer. Past that date it's stale. `/back` and `doctor` list stale ones.
- Status is `draft` (not fact-checked), `current`, `stale` (re-check due) or `superseded by <what>`.
- If the evidence is thin, say so. Don't dress up a guess as a finding.

## Competitor scan

A lighter kind of research, started by `grill` in the background once "who and why" and "the main flow" are done. Everyday model, medium effort (see `routing`). It doesn't stop the grill.

1. **Find 3 to 8 competitors,** plus what people use today instead: a spreadsheet, a general tool, or nothing.
2. **For each:** what it does well, what it does badly, its pricing and free tier, and who it's for. Check its own site and docs, and say when you couldn't.
3. **What users complain about:** reviews, forums, app-store comments. Quote short and link.
4. **The gaps:** what nobody does well, and where this app could stand out.
5. **Write it** to `docs/research/competitors.md` (`kickoff/research/competitors.md` before the repo exists) from the template, with its store, its `provenance.json` and its index row. Label every claim. Keep it under 2 pages.
6. **Fact-check it in the background,** the same way as above. Until then it's `draft`.
7. **Bring back five lines** for the MVP topic: what exists, the top complaints, and the gaps. Say it's a draft until the fact-check is done.

In `/join`, offer it once as an optional step. Re-run it before a big new feature or a pricing decision.

## References

Load a file only when its row fits.

| File | Load when |
|---|---|
| `references/desk-research.md` | Writing a dossier's store (hypotheses, coverage, sources, claims) or running its fact-check. |
| `references/provenance.md` | Writing `provenance.json`, starting a helper or fact-checker, or backfilling an old dossier. |
| `references/measurements.md` | The dossier rests on numbers you measure yourself. |
| `references/provenance.schema.json` | You need the exact shape of `provenance.json`. |
| `references/library.md` | Step 9: capturing to the research library, or offering to make one. |
| `references/library.schema.json` | You need the exact shape of `research-library.json`. |
