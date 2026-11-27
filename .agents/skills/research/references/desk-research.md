# Desk research: the store and the fact-check

Desk research is reading: docs, source code, registries, reviews. Each dossier keeps what it read in a small store, so a fact-checker can retrace every claim.

## The store

A dossier `docs/research/<topic>.md` has a folder `docs/research/<topic>/`:

| File | What | When |
|---|---|---|
| `briefs/<role>.md` | The brief each role got, verbatim. | Before that role starts. |
| `hypotheses.md` | What you expect to find, and what would prove you wrong. One line each. | Before the first search. |
| `coverage.md` | The coverage matrix: options down the side, the questions across the top. Each cell names claim IDs, or says `gap`. | Grows as you read. |
| `sources.csv` | Every source opened. Append-only. | Each time you open one. |
| `claims.csv` | Every concrete claim the dossier makes. Append-only. | Each time you write one. |
| `fact-check.csv` | The fact-check's findings and what was done with each. | During the fact-check. |
| `provenance.json` | Who did each role, on which model and effort. See `provenance.md`. | When each role starts and ends. |

Set `"stores": ["desk"]` in `provenance.json`. The checker then requires the first four files.

**Append-only** means: add rows at the end. Never edit or delete a row. A claim that turned out wrong gets a new row that says so, and the dossier text is fixed. `node .agents/skills/research/scripts/check-research.mjs <dir> --base origin/main` checks this against the merge base, from the session.

## The columns

`sources.csv`, exactly these columns:

```
id,title,location,accessed,read
```

- `id`: short and stable, like `s12`.
- `location`: a URL, or a repo path with a commit or tag.
- `accessed`: the date, `YYYY-MM-DD`.
- `read`: `full` or `skimmed`.

`claims.csv`, exactly these columns:

```
id,claim,label,sources,date
```

- `sources`: source IDs joined by `;`. A measured claim may name a run as `run:<run-id>`.
- `label`: how the claim is known. One of:

| Label | Means |
|---|---|
| `measured` | You ran it and saw the number. Needs a run (see `measurements.md`) or a source that holds the output. |
| `read-in-source` | Read in the code, the spec or the official docs. |
| `vendor-claim` | The vendor says so, and you couldn't test it. |
| `anecdote` | A user report, a forum post, one person's experience. |
| `summary-only` | You only read a summary, a search snippet or a secondhand page. |

In the dossier's prose, mark each claim with its ID or its label. Opinion stays opinion: say "I think".

## Steps

1. **Write the brief and the hypotheses** before the first search. Commit them.
2. **Read.** Log every source in `sources.csv` as you open it, even the useless ones. "Not found in 6 searches" is a finding: log the searches as sources too.
3. **Write claims** to `claims.csv` as you go, then the dossier from the claims. Fill the coverage matrix. A `gap` cell is fine. Say it in the dossier.
4. **Hand off to the fact-check.** Done when the checker passes and every option has a row in the coverage matrix.

## The fact-check

Fresh context, every time. A new session that never saw the author's thread. Another model if you have one. It gets the dossier, the store and this file, not the author's conclusions.

1. It checks every claim in `claims.csv` against its source. It re-runs a measurement only when the run folder makes that possible.
2. It writes one row per finding to `fact-check.csv`:

   ```
   finding,claim,disposition,reason
   ```

   - `claim`: the claim ID, or empty for a finding about the whole dossier.
   - `disposition`: `fixed` (the dossier was corrected), `disputed` (the author disagrees, with evidence), or `accepted` (true but left as is: the effect is small, or it's out of scope).
   - `reason`: always. One sentence.
3. The author applies the fixes, then fills in each disposition. A `disputed` row needs evidence in its reason, not a feeling.
4. Its `provenance.json` entry points `disposition` at `fact-check.csv`.

**Done when** every finding has a disposition and a reason. Only then can the index say `current`. Nobody acts on a `draft` dossier.
