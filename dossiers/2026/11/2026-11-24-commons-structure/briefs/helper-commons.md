# Brief: helper, how large text and research repositories are built

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

## Your cluster: how large text and research repositories are built

ID prefix: `com`. Part folder: `/tmp/claude-0/-home-user/bc22ab20-7f4f-5c29-a7d3-1f602cdbd278/scratchpad/parts/commons/`.

Hypotheses under test (written before any search):
- **H1.** A flat store with tags in a metadata file and a generated index beats a folder tree as the main way to group.
- **H10.** One generated index page stops working near 1,000 items. The index has to be split, and the store has to be split into subfolders.
- **H12.** Checking only the changed item on a pull request keeps CI time flat as a repository grows.

Look at how real repositories that hold thousands of documents in git are laid out. Read the repository's own tree, contributing guide and build scripts through its web pages. For each one report: the folder layout and what the folders mean, the number of documents (with the date and how you counted), where metadata lives (front matter, side file, file name), how the index or site is generated and whether generated files are committed, what CI checks on a pull request and whether it checks only changed files, and how renames, redirects and deletions are handled.

1. MDN content (`mdn/content`): folder-per-page layout, front matter, the redirects file, flaw checks, review process.
2. Python PEPs (`python/peps`): file naming, header fields, how the PEP index (PEP 0) is generated and grouped by status and type.
3. Rust RFCs (`rust-lang/rfcs`) and the generated RFC book.
4. tldr-pages: layout by platform, the page count, the lint rules, the generated index or archive.
5. Our World in Data's `etl` repository: the `namespace/version/short_name` layout, the processing stages, where metadata lives, and that the data itself is kept outside git. Also its catalogue or search.
6. The Turing Way, or another community-written research handbook: layout and review.
7. One or two public "research notes" or "living review" commons that take contributions by pull request, if you can find good ones (for example a living literature review kept in git, or an open evidence base). Say how they handle updates and stale entries.
8. The Stanford Encyclopedia of Philosophy's fixed quarterly archives, as a model of citable versions of living articles.
9. Package or manifest repositories with one folder per item at very large scale (winget-pkgs, nixpkgs `pkgs/by-name`, Homebrew): how they shard folders (by first letter or prefix) and why, in their own words.
10. Any write-up with numbers on git and GitHub behaviour with very many small files or very large folders (clone time, tree listing limits, sparse checkout), and on static search over a JSON index of a few thousand to ten thousand records (for example client-side search libraries and their stated limits).
