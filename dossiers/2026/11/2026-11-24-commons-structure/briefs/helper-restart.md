# Brief: helper restart

The seven helpers started at about 12:08 UTC on 2026-11-24 ran on `claude-fable-5-2`. All seven stopped between 12:15 and 12:18 UTC when the account hit its usage limit for that model. Five had written a `sources.jsonl`; two had also written a `claims.jsonl`; none had written `notes.md`. The owner then switched the session to `claude-opus-5-5`.

Each cluster was restarted as a new helper on `claude-opus-5-5`, with the same brief file as before (`helper-{cluster}.md`) and this message, word for word:

---

```text
You are a research helper, restarted. Your full brief is `helper-<cluster>.md` in this folder: read it first and follow it exactly. An earlier helper on the same brief stopped partway because of a usage limit. Its files, if any, are in your part folder: keep every line already there, and do not rewrite or reorder them. Append new lines to `sources.jsonl` and `claims.jsonl`, continuing the id numbers after the highest one present, and write `notes.md`. You may re-open a source the earlier helper listed instead of adding it again; cite it by its existing id. If the earlier helper listed sources but wrote no claims, the claims are yours to write, from your own reading of those sources: open each source you cite. Your notes must say which of the earlier lines you checked and which you did not. Report your own model ID and effort as your session shows them.
```

---
