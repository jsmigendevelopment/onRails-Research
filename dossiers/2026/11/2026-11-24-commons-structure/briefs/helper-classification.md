# Brief: helper, grouping, categories and tags

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

## Your cluster: grouping, categories and tags

ID prefix: `cls`. Part folder: the path given in the message that started you.

Hypotheses under test (written before any search):
- **H1.** A flat store with tags in a metadata file and a generated index beats a folder tree as the main way to group.
- **H2.** Fixed tag lists stop sprawl, and free tags sprawl.
- **H3.** One primary domain plus optional secondary domains (the arXiv "primary category plus cross-lists" idea) is enough when an item fits two domains.
- **H4.** Diátaxis's four kinds of documentation do not map onto research write-ups. A commons needs its own short list of kinds (for example comparison, how-to, trap, benchmark, dataset).

Questions:
1. arXiv: how the category taxonomy is built (archives, subject classes), how a primary category and cross-lists work, limits on cross-listing, who can reclassify (moderators), how new categories get added and how often, and any published criticism of the scheme.
2. Papers with Code: how it grouped papers (tasks, methods, datasets), who could edit the taxonomy, and what happened to the site in 2025 (was it shut down or moved, and where to). Report exactly what the official pages say.
3. Wikipedia: the categorisation guidelines, what "overcategorisation" is and how it is fought, how categories get created, renamed and deleted (Categories for discussion), category trees versus lists versus tags, and known problems with the category system (studies or essays with numbers).
4. Diátaxis: the four kinds, the two axes behind them, what the author says about content that fits none or two of them, and whether it claims to cover research or reference data.
5. Our World in Data: how it groups its work for readers (topic pages, tags, areas), and how many topics and charts it has.
6. Faceted classification versus one hierarchy: the library-science sources (Ranganathan's facets, controlled vocabularies, thesauri such as MeSH: how new terms are added and how often), and guidance on how many facets and values people can handle.
7. Evidence on tag sprawl: free tagging (folksonomies) versus controlled lists. Stack Overflow's tag rules (who can create a tag, tag synonyms, merging, numbers), GitHub topics, Hugging Face Hub tags (which are fixed lists, which are free), npm keywords. Look for measured studies and for the platforms' own rules.
8. Big "awesome" lists and similar curated lists: how they group entries (sections, sub-lists), what the `awesome` list guidelines demand, and how the largest ones cope with growth (splitting into sub-lists, generated tables, staleness).
9. Rules other projects use to keep a fixed vocabulary small: a minimum number of items before a new value, a definition per value, aliases or synonyms for renamed values, a cap on tags per item.
