# Brief: helper, identity, versions, superseding, retraction and freshness

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

## Your cluster: identity, versions, superseding, retraction and freshness

ID prefix: `idv`. Part folder: the path given in the message that started you.

Hypotheses under test (written before any search):
- **H6.** An ID made of the creation date plus a short slug, never changed afterwards, is better than a running number, because running numbers collide when two pull requests are open at once.
- **H7.** Small fixes are edits in place with a logged correction. A changed conclusion is a new record that supersedes the old one, which stays.
- **H8.** A retracted record is never deleted. It keeps its ID and a notice that says why.
- **H9.** A re-check date per record, with "stale" worked out by a script from today's date, is how others keep reference material fresh.

Questions:
1. Architecture decision records: Nygard's original post, the `adr-tools` and MADR conventions, the status values (proposed, accepted, deprecated, superseded), how superseding is recorded on both records, whether an accepted record may be edited, and reports of number collisions between concurrent branches and how teams avoid them.
2. Numbered proposal series: IETF RFCs (immutable, Obsoletes and Updates, errata), Python PEPs (PEP 1 and PEP 12: header fields, status values, Superseded-By, Replaces, who assigns numbers), Rust RFCs (how the number is assigned from the pull request number, and the file rename step), Kubernetes KEPs. For each: who assigns the ID, when, and what a rename does.
3. arXiv: the identifier scheme (`YYMM.NNNNN` and `vN`), what a new version is and what happens to old versions, withdrawal (what stays visible), and how a published paper links to its later version.
4. DOIs and research data: DataCite's metadata for versions and relations (`IsNewVersionOf`, `IsPreviousVersionOf`, `IsSupersededBy`, `Obsoletes`, `IsVersionOf`), DataCite's or DOI best practice on tombstone pages when content is removed, and Zenodo's "concept DOI versus version DOI" model.
5. Retractions and corrections in publishing: the COPE retraction guidelines (what a retraction notice must say, that the retracted article stays available and marked), the difference between a correction (erratum, corrigendum), an expression of concern and a retraction, and Crossmark. Also how Wikipedia or big docs sites mark disputed or outdated pages.
6. Freshness: who uses review-by or re-check dates and how well it works. GOV.UK content review dates, NHS or NICE review dates, Cochrane "living systematic reviews" and review update status, Microsoft Learn or MDN "last reviewed" metadata and staleness tooling, Stack Overflow's handling of outdated answers. Look for evidence that review dates get ignored, and for what makes them work.
7. Stable identifiers on the web: "Cool URIs don't change", opaque versus meaningful IDs, the trade-off of a date or a slug inside an ID (what breaks on rename), ARK or PURL practice in short.
8. Any published convention for date-based or slug-based IDs in file-based knowledge bases (Zettelkasten timestamps, Jekyll and Hugo post names, changelog fragment file names) and their known problems.
