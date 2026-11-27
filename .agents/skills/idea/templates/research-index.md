# Research

One row per dossier. Dossiers answer the crucial, uncertain, expensive-to-undo questions (the `research` skill). Each has a `<topic>/` folder with its `provenance.json` and its store.

- **Status:** `draft` (not fact-checked yet: nobody acts on it), `current`, `stale` (past its re-check date), or `superseded by <what>`.
- **Re-check:** 6 months after the date at most; 3 or fewer for prices, betas and fast-moving tools.
- **Decision:** link the row in `../decisions.md` it fed, or write "none yet".

Check this folder: `node .agents/skills/research/scripts/check-research.mjs docs/research/`.

| Dossier | Question | Decision | Date | Status | Re-check | Author model · effort |
|---|---|---|---|---|---|---|
