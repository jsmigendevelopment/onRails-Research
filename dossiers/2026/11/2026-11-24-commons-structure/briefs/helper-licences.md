# Brief: helper, licences for text, code and data

The brief this helper got, word for word. The helper was started with only a pointer to this file and the path of a scratch folder for its part files.

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

## Your cluster: licences for text, code and data

ID prefix: `lic`. Part folder: the path given in the message that started you.

Hypothesis under test (written before any search):
- **H18.** The common pattern for an open research commons is CC BY 4.0 for text, a permissive licence (MIT or Apache-2.0) for code, and CC0 or CC BY for data. Share-alike is rare outside Wikipedia. Also check: can text written with AI help carry a licence at all?

Questions:
1. What do these projects use, for text, code and data separately (read the licence file or the official licence page, not a badge): Our World in Data, Wikipedia and Wikidata, arXiv (the licences authors choose from), MDN Web Docs (prose versus code samples), GitHub Docs, the Rust RFCs repository, Python PEPs, Diátaxis, The Turing Way, Stack Overflow content, Hugging Face (per dataset), Papers with Code data, Zenodo defaults, OpenStreetMap, the `awesome` lists (CC0?).
2. The Creative Commons licences in short, from creativecommons.org: CC0 1.0, CC BY 4.0, CC BY-SA 4.0, CC BY-NC 4.0. What each asks of a reuser, what Creative Commons itself says about using its licences for software (not recommended) and for data and databases, attribution stacking, and one-way compatibility (BY into BY-SA, BY-SA 4.0 into GPLv3).
3. Data licences: CC0, CC BY 4.0, ODbL 1.0, PDDL, CDLA-Permissive-2.0 (what problem it solves, who uses it), and what the Open Data Commons and Linux Foundation pages say. Facts are not copyrightable in the US: what that means for a table of numbers, and the EU database right in one paragraph.
4. Code licences for small scripts: MIT versus Apache-2.0 (patent grant, NOTICE) versus 0BSD or the Unlicense. What GitHub's licence detection does when a repository has several licence files (`LICENSE`, `LICENSE-CODE`, `LICENSE-DATA`, a `LICENSES/` folder), and what the REUSE specification asks for (current version).
5. Inbound contributions: GitHub Terms of Service section on "inbound = outbound" licensing of contributions, the Developer Certificate of Origin versus a contributor licence agreement, and what small projects do.
6. AI-written text: the US Copyright Office's current position on works made with generative AI (its reports of 2023 to 2025, by part), the position in the EU or UK in short, and what Creative Commons says about applying CC licences to AI-generated material. What does this mean for a licence on dossiers that an AI agent drafted and a person reviewed?
7. Third-party data inside a commons: how Our World in Data and Hugging Face record the upstream licence per dataset, and the rule that a repository's licence cannot relicense someone else's data.
8. Trade-offs to report plainly: attribution burden on reusers, share-alike blocking reuse in closed products, non-commercial clauses blocking reuse, and CC0 giving up attribution. Find sources arguing for share-alike in a research commons as well as against.
