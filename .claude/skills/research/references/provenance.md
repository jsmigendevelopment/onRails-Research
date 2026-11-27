# Provenance: which model and effort did each role

Every dossier records who did each part of the work. A dossier from a strong model at high effort and one from a quick pass read the same. Provenance is how a reader tells them apart.

## The file

`docs/research/<topic>/provenance.json`, shaped by `provenance.schema.json` (next to this file):

```json
{
  "schema": "research-provenance/1",
  "dossier": "<topic>.md",
  "stores": ["desk"],
  "roles": [
    {
      "role": "author",
      "model": "<exact model ID>",
      "effort": "high",
      "harness": "<tool and version>, main thread",
      "started": "YYYY-MM-DD",
      "finished": "YYYY-MM-DD",
      "brief": "briefs/author.md"
    },
    {
      "role": "fact-check",
      "requested": { "model": "<model ID asked for>", "effort": "high" },
      "model": "<model ID it ran on>",
      "effort": "medium",
      "harness": "<tool and version>, subagent",
      "started": "YYYY-MM-DD",
      "finished": "YYYY-MM-DD",
      "brief": "briefs/fact-check.md",
      "disposition": "fact-check.csv",
      "notes": "Ran at medium: the tool capped subagent effort."
    }
  ]
}
```

- **Roles:** `author` (one or more passes), `helper` (a subagent that searched or measured for the author), `fact-check`, `reviewer` (a person or agent who read it before the decision). One entry per role per session.
- **Every field is present.** A value nobody recorded is `"unknown"`. Never leave a field out. Never guess.
- **`model`** is the exact ID, lowercase, as the session reports it. Not the marketing name.
- **`effort`** is one of `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, or `unknown`.
- **`harness`** is the tool and its version, and whether it ran as a subagent.
- **`brief`** is the path to the brief, committed verbatim before the role started.

## Who writes what

1. **Each role writes its own entry** from what its own session reports: the system prompt, the model picker, or the tool's status line. Copy the model ID exactly. If the session doesn't show the effort, write `unknown`.
2. **The agent that starts a helper or a fact-checker** writes `requested`: the model and effort it asked for.
3. **The helper confirms** what it actually ran on, in `model` and `effort`. If the two differ, keep both, and say why in `notes`: a fallback model, a capped effort, a limit hit.

The checker fails a role with a missing field, a model with spaces or capitals, an effort outside the list, a brief that isn't committed, or a `requested` that differs from the actual run with no `notes`. It warns when the fact-check ran on the author's model.

## In git

The commit or pull request that adds or re-checks a dossier carries two trailer lines, so it can be found from the git log:

```
Research-Model: <the author's exact model ID>
Research-Effort: <the author's effort, or unknown>
```

Find them later with `git log --grep '^Research-Model:'`.

## In the index

The index row shows the author's model and effort, as `` <model> · <effort> ``. The checker fails the row if it doesn't match `provenance.json`.

## Backfilling an old dossier

Write what the record shows: the dossier's own notes, its fact-check section, the git log and its trailers. A commit's co-author line names the session that committed, not the model that did the research, so it isn't enough on its own. Everything else is `unknown`, with `notes` saying where you looked.
