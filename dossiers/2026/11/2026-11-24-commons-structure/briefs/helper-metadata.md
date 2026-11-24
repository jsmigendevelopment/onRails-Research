# Brief: helper, metadata standards for dossiers and data

The brief this helper got, word for word. The helper was started with only a pointer to this file.

## Who you are helping

You are a research helper. The author is designing a public "research commons": one public GitHub repository that will hold thousands of short, sourced research write-ups ("dossiers") contributed by pull request, each in its own folder with a findings file, a provenance record and tags from fixed lists. The author needs evidence, not opinions, to choose its structure. You cover one cluster of sources. Other helpers cover the rest.

## Hard rules

1. **Research only.** Read. Never install, sign up, log in, fill in a form or run someone's code. A read-only look at a public repository's files through its web pages or raw URLs is fine.
2. **Read primary sources.** The project's own docs, spec, policy page, repository or pricing page. A blog post about a thing is not the thing. If you only saw a search snippet or a secondhand summary, label the claim `summary-only`.
3. **Never work around a block.** If a page refuses the fetch, try one other route (another official URL for the same fact), then record it as blocked and move on.
4. **Privacy.** Never put any person's name, account name, repository name or project detail from this brief into a search or a request. Search for the general thing only.
5. **Dates.** Today is 2026-11-24. Prices, quotas, limits and product status change. For each one, find the page's own "last updated" date if it shows one and put it in the source title. Do not "correct" a name, version or product you do not recognise: report what the page says.
6. **Quotes are short.** Under 25 words, exact, only when the wording matters.
7. **Look for evidence against.** For each hypothesis listed in your cluster, run at least one search aimed at proving it wrong, and say what you found.
8. **Say what you did not find.** "Not found in N searches" is a finding. Never write "does not exist".
9. **Stop at saturation.** When three differently worded searches on a question bring nothing new, stop that question. About 25 to 40 well-read sources beat 100 skimmed ones.
10. **No guesses.** If you could not check something, list it under "Could not verify".

## Labels (one per claim)

| Label | Means |
|---|---|
| `measured` | The source's authors measured it and give the number and the sample. |
| `read-in-source` | You read it in the thing's own docs, spec, policy, pricing page or code. |
| `vendor-claim` | A vendor says it about its own product, it is a judgement or a promise, and you could not check it. |
| `anecdote` | One person's report: a forum post, an issue comment, a blog. |
| `summary-only` | You only saw a snippet, a summary or a secondhand page. |

## What to write

Write three files into your part folder (given below). Use plain UTF-8. No other files.

1. `sources.jsonl`: one JSON object per line, one per source you opened (even the useless ones):
   `{"id":"<prefix>-s01","title":"<page title> (<publisher>, <published or updated date, or undated>)","location":"<URL>","accessed":"2026-11-24","read":"full"}`
   `read` is `full` or `skimmed`. Log a search that found nothing as a source too, with `location` set to `search: <the query>` and `read` set to `full`.
2. `claims.jsonl`: one JSON object per line, one per concrete, checkable claim:
   `{"id":"<prefix>-c01","claim":"<one or two plain sentences in your own words, with the number and its unit and date>","label":"<label>","sources":"<prefix>-s01;<prefix>-s02","quote":"<optional short exact quote>","bears_on":"H10 against"}`
   `bears_on` names the hypotheses it supports or weakens (`H3 for`, `H3 against`), or is empty.
3. `notes.md`, under 900 words:
   - the 10 to 15 findings that matter most for the design, each with claim ids;
   - per hypothesis in your cluster: holds, holds with a qualification, weakened or refuted, with claim ids;
   - what you could not verify, and pages that blocked you;
   - searches that found nothing;
   - the model ID and effort level your own session reports, copied exactly, or `unknown` if your session does not show them. Do not guess.

Your final message back is a five-line summary and the path of your part folder. The files are the result.

## Your cluster: metadata standards for dossiers and data

ID prefix: `met`. Part folder: the path given in the message that started you.

Hypotheses under test (written before any search):
- **H5.** Tags should live in a small JSON file per dossier, not in YAML front matter, because the checker must run on plain Node with no dependencies and Node has no built-in YAML reader.
- **H17.** Frictionless Data's package format already describes "a link, a checksum, a size and a licence per file", so a dossier's data file should follow it instead of a home-made shape.

Questions:
1. Frictionless Data: the current Data Package and Data Resource specs (version, date, who maintains them: check for "Data Package v2" and its standard site). The exact field names for a resource's location (can `path` be a remote URL), `hash` (format and default algorithm), `bytes`, `format`, `mediatype`, `licenses`, `sources`, `contributors`, `version`, `created`. Must the descriptor file be called `datapackage.json`? What is required and what is optional?
2. Hugging Face dataset cards and model cards: where the metadata lives (YAML block at the top of README.md), which fields are validated against fixed lists (license, task_categories, language, size_categories) and which are free, what the Hub does with an invalid value, and the documented card sections.
3. schema.org `Dataset`: the properties Google Dataset Search asks for (required and recommended), `distribution` and `DataDownload`, `sha256`, `version`, `isBasedOn`, `license`, `dateModified`, `creativeWorkStatus`. Also schema.org types that fit a research write-up (`Report`, `ScholarlyArticle`, `TechArticle`) and properties for superseding or correction (`correction`, `supersededBy`, `isPartOf`).
4. DataCite Metadata Schema, current version and date: the mandatory properties, the recommended ones, `resourceTypeGeneral` values that fit a report and a dataset, `relatedIdentifier` relation types for versions, sources and data ("IsSupplementedBy", "IsDerivedFrom", "Cites"), and `rights` with SPDX identifiers.
5. Other small standards a text repository can adopt cheaply: `CITATION.cff` (what GitHub does with it), CodeMeta, RO-Crate, Dublin Core terms, the FAIR principles (what F, A, I and R ask for in practice), datasheets for datasets, and W3C PROV in one paragraph: what it models and whether small projects use it.
6. Our World in Data's metadata: what it records per dataset and indicator (origins, licences, processing level, update dates), and where it keeps the data itself versus the code and metadata (git versus object storage).
7. Front matter versus side files: what GitHub does with YAML front matter in a Markdown file (does it render a table), which big docs repositories use front matter and how they validate it, and any reports of side-car metadata files drifting from the content. Is there any JSON front matter convention that tools support?
8. Recording how a file was made: checksums (which algorithm is standard today), "provenance" fields in these standards, and SPDX licence identifiers for data licences (CC0-1.0, CC-BY-4.0, CDLA-Permissive-2.0, ODbL-1.0, PDDL-1.0).
