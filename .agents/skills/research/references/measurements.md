# Measurements: benchmarks you can rerun

Load this when a dossier rests on numbers you produce yourself: speed, size, cost per request, memory. A number nobody can rerun is an anecdote.

## The store

Set `"stores": ["measurements"]` in `provenance.json` (with `"desk"` too when the dossier also reads sources). Then:

```
docs/research/<topic>/
  runs/<run-id>/manifest.json    written before the data
  runs/<run-id>/results.csv      one row per measurement
  runs/<run-id>/raw/             logs and tool output, as they came
  summaries/<machine>.md         one summary per machine
```

`<run-id>` is `YYYY-MM-DD-<short-name>`, like `2027-01-14-cold-start`.

## The rules

1. **Write the manifest before the data.** Commit it before the first run. It fixes what you'll measure, so you can't pick the metric after you've seen the numbers. Fields:

   ```json
   {
     "run": "<run-id>",
     "created": "YYYY-MM-DD",
     "question": "the question this run answers",
     "machine": "a short label: os, cpu, memory",
     "command": "the exact command that runs it",
     "cases": ["the cases"],
     "metrics": [{ "name": "the metric", "unit": "ms" }],
     "warmup": 3,
     "iterations": 20,
     "versions": { "tool": "version" }
   }
   ```

   The checker requires `run`, `created`, `question`, `machine`, `command`, `cases` and `metrics`.
2. **Results are a tidy long CSV** with exactly these columns:

   ```
   run,machine,case,metric,unit,iteration,phase,value,status
   ```

   One row per measured value. `phase` is `warmup` or `measure`. `status` is `ok` or `failed`. A failed row keeps an empty or partial `value`.
3. **Keep every row.** Warm-up rows and failed rows stay in the file. Summaries leave them out, and say how many there were.
4. **Run folders are append-only.** Never edit or delete a file in `runs/`. A bad run stays, and a new run folder replaces it. `node .agents/skills/research/scripts/check-research.mjs <dir> --base origin/main` checks this against the merge base, from the session.
5. **Summarise per machine.** `summaries/<machine>.md` covers one machine. Never average across machines. Compare them side by side.
6. **Label every number in the prose** `[measured]` (with the run ID) or `[estimated]` (with how). The review checks this; the checker can't.

## Done when

The manifest's commit comes before its results. The checker passes. Every number in the dossier is labelled.
