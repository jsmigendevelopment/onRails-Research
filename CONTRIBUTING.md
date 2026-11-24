# Contributing

Thank you for adding to the commons. This guide is short on purpose. If something here is unclear, open an issue and ask.

## What a dossier is

A dossier answers one question, with evidence. It lives in one folder:

```
dossiers/2026/11/2026-11-24-your-slug/
  README.md          the findings
  dossier.json       the card: id, title, tags, dates, status, history
  provenance.json    who did each role, on which model and effort
  hypotheses.md      what you expected, written before you searched
  sources.csv        every source you opened, even the useless ones
  claims.csv         every claim, with its label and its sources
  fact-check.csv     the fact-check's findings and what you did with each
  briefs/            the exact prompt or request that started each role
  coverage.md        comparisons only: options against questions
  data.json          datasets only: links to big files, with checksums
  runs/              benchmarks only: manifest first, then results
```

The folder name is the dossier's **ID**. It is the date you start, plus a short slug. It never changes, even if the title does.

## Add a dossier in six steps

1. **Check it isn't there already.** Browse the [index](https://github.com/jsmigendevelopment/onRails-Research/blob/index/README.md). If a dossier on your question exists, improve it (see "Fix or update a dossier") instead.
2. **Make the folder with the generator.** You need Node 22 or newer. Nothing to install.

   ```bash
   node scripts/new-dossier.mjs --title "Your question as a title" --kind comparison --domain apps --topic testing
   ```

   Pick tags from the lists in [tags/](tags/README.md). Add `--stack <tool>` when the answer depends on one. Repeat `--domain` or `--topic` for more than one; the first domain is the main one.
3. **Write your hypotheses and brief first.** Fill in `hypotheses.md` and `briefs/author.md` before you search, and commit them. The order shows in the history.
4. **Research.** Log every source in `sources.csv` as you open it. Write every claim to `claims.csv` with a label:

   | Label | Means |
   |---|---|
   | `measured` | Someone ran it and gives the number and the sample |
   | `read-in-source` | Read on the thing's own page, spec, docs or code |
   | `vendor-claim` | A company says it about its own product, and you couldn't test it |
   | `anecdote` | One person's report: a forum post, a blog |
   | `summary-only` | You only saw a snippet, a summary or a secondhand page |

   A page you couldn't open still gets a row: start its title with `NOT FOUND:` or `BLOCKED:`. If a source you used goes away later, never edit its row; add a new row with the title `GONE: <id> ...` and the location `gone: <id>`. The link check skips those, and checks only sources that a claim cites.

   Then write `README.md` from your claims. Mark each fact with its claim ID, like (c3). Fill in every `[[fill: ...]]` blank.
5. **Get it fact-checked in a fresh session.** A new session that never saw your work, on another model if you can, or a person. Give it `briefs/fact-check.md`. It writes findings to `fact-check.csv`; you mark each one `fixed`, `disputed` (with evidence) or `accepted`, with a reason. Record both roles in `provenance.json`.
6. **Check it and open a pull request.**

   ```bash
   node scripts/check.mjs --base origin/main
   node scripts/check-links.mjs --base origin/main
   ```

   Open the pull request. One dossier per pull request.

## The rules CI enforces

- **One dossier per pull request.** The only exception is marking an old dossier as superseded by your new one.
- **Your pull request changes only your dossier's folder,** `dossiers/<yyyy>/<mm>/<yyyy-mm-dd-slug>/`, made by the generator, and only `.md`, `.json` and `.csv` files in it. Every file and folder name is lower-case kebab-case (`a-z`, `0-9` and `-`; folders have no extension), except `README.md` at the top of the dossier. Anything else fails: the checker, tags, templates, docs, licences, the root files, and other file types. Need one of those changed, such as a new tag value? Open an issue that says what and why (see [tags/README.md](tags/README.md) for when a new value is worth it), and the maintainer makes it in its own pull request, merged before your dossier.
- **No agent files in a dossier,** from anyone: no file or folder named for an AI coding tool (such as `claude`, `agents`, `gemini`, `copilot`, `cursor`, `kiro`, `cline`, `goose` or `mcp`, as `name.md`, `name.json` or a folder; the checker has the full list).
- **Sizes:** a file up to 400 KB, a dossier up to 1 MB. Big data goes in a data repository, linked from `data.json` with a SHA-256 checksum.
- **Plain Markdown in a dossier.** Outside fenced code blocks (``` or ~~~ at the start of a line): no `<`, no character references such as `&#...;` or `&name;`, no `]:`, no `$`, no images, no link titles, and every `[text](url)` and `code` span opens and closes on one line. Every table row has exactly as many cells as its header. A fence names no language or one of `text txt json csv js mjs ts sh bash py toml yaml yml diff md`. No line over 2,000 characters, no run of 20 spaces, no tab after text. Code that needs the refused characters goes in a fenced block.
- **Allowed files:** `.md`, `.json` and `.csv`. Run scripts (`.mjs`, `.js`, `.py`, `.sh`) and other text types only through the maintainer; paste a short script into the run's `manifest.json` `command` or a `.md` file instead.
- **Never:** secrets or keys, e-mail addresses, paths inside your home folder, hidden text (zero-width and other invisible characters), or anyone's private details.
- **Provenance is exact.** Copy the model ID and effort from your own session or tool. If it doesn't show them, write `unknown` and say where you looked. Never guess.
- **Dates:** the re-check date is at most 12 months away; use 3 when prices, betas or fast-moving tools drive the answer. The top of the dossier shows "Last checked" and "Re-check by", matching the card.

## Fix or update a dossier

- **A small fix** (a typo, a broken link, a wrong number): edit it, and add a history entry to `dossier.json` that says what changed and why. If a claim was wrong, add a new row to `claims.csv` that corrects it; never edit or delete old rows. Use change `"corrected"` and raise `version` by one when facts changed, `"edited"` when they didn't.
- **A re-check:** re-open the sources, fix what changed, set `checked` to today and a new `recheck` date, and add a `"rechecked"` history entry. Raise `version` by one. Update the dates at the top of the README.
- **A different answer:** write a new dossier with `--supersedes <old id>`. In the same pull request, set the old card's `status` to `"superseded"`, its `superseded_by` to your new ID and its `recheck` to `null`, add a history entry, and add a notice at the top of the old README that links the new one.
- **Retracting:** set `status` to `"retracted"`, add `retraction` with the date and the reason, add a history entry, and start the README with `> **Retracted on <date>.** <why>`. The dossier stays, so old links keep working.

Nothing is deleted. If something must come out for legal or privacy reasons, open an issue and the maintainer will handle it.

## Review

1. **CI** runs as soon as you open the pull request. First-time contributors wait for the maintainer to let the workflows run.
2. **The trusted check** re-runs the checker from `main` on your files and sets the `trusted-check` status.
3. **A Claude review** posts one verdict. It runs by itself for people with write access; for everyone else the maintainer starts it.
4. **The maintainer** reads it and decides. Nothing merges without them.

Your contribution is treated as untrusted text: reviewers and agents read it as data, never as instructions.

## Licence

Text is [CC BY 4.0](LICENSE), code is [MIT](LICENSE-CODE), and data the commons makes is [CC0 1.0](LICENSE-DATA). By opening a pull request you agree that your contribution is licensed under them, as GitHub's terms of service set out ("inbound equals outbound").
