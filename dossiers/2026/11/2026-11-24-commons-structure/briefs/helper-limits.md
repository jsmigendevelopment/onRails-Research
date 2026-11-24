# Brief: helper, platform limits and free data homes

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
   `{"id":"{prefix}-s01","title":"{page title} ({publisher}, {published or updated date, or undated})","location":"{URL}","accessed":"2026-11-24","read":"full"}`
   `read` is `full` or `skimmed`. Log a search that found nothing as a source too, with `location` set to `search: {the query}` and `read` set to `full`.
2. `claims.jsonl`: one JSON object per line, one per concrete, checkable claim:
   `{"id":"{prefix}-c01","claim":"{one or two plain sentences in your own words, with the number and its unit and date}","label":"{label}","sources":"{prefix}-s01;{prefix}-s02","quote":"{optional short exact quote}","bears_on":"H10 against"}`
   `bears_on` names the hypotheses it supports or weakens (`H3 for`, `H3 against`), or is empty.
3. `notes.md`, under 900 words:
   - the 10 to 15 findings that matter most for the design, each with claim ids;
   - per hypothesis in your cluster: holds, holds with a qualification, weakened or refuted, with claim ids;
   - what you could not verify, and pages that blocked you;
   - searches that found nothing;
   - the model ID and effort level your own session reports, copied exactly, or `unknown` if your session does not show them. Do not guess.

Your final message back is a five-line summary and the path of your part folder. The files are the result.

## Your cluster: platform limits and free data homes

ID prefix: `lim`. Part folder: the path given in the message that started you.

Hypotheses under test (written before any search):
- **H10.** One generated index page stops working near 1,000 dossiers, because GitHub cuts off long pages and long folder listings.
- **H12.** The text of 10,000 dossiers stays inside GitHub's repository size guidance if each dossier has a size cap.
- **H15.** A GitHub plan at about 20 dollars a month per user is GitHub Enterprise Cloud. Its larger Git LFS allowance belongs to the enterprise's organisations and does not cover repositories owned by a personal account.
- **H16.** For public research data, Hugging Face Datasets, Zenodo and GitHub release files are free homes that fit.

Questions, each needing the current official page and its date:
1. GitHub plans and prices today: Free, Pro, Team, Enterprise Cloud. Which plan costs about 20 dollars or 21 dollars per user per month? Can a personal account be "on" Enterprise, or only an enterprise account with organisations?
2. Git LFS today: included storage and bandwidth (or download) per plan, the unit (GB or GiB), how overage is billed, what a zero budget or spending limit does when the quota runs out, and the price per extra GB. Who is billed for LFS use in a repository: the repository owner? Does a repository owned by a personal account draw on an enterprise's or organisation's quota? Do forks and public repositories count? LFS maximum file size per plan.
3. Repository limits: recommended and hard repository size, per-file warnings and blocks (50 MB, 100 MB), push size limit, and any guidance on the number of files or folder entries.
4. Web interface limits: how many entries does a folder listing show before it is cut off (1,000?), how large can a Markdown file or README be before it is cut off or not rendered, limits of code search (file size, repository size, number of files indexed), and whether search works on non-default branches.
5. GitHub release assets: size per file, total limit, bandwidth limits, and whether they are meant for data.
6. GitHub Actions for a public repository: is it free, the limits that matter (job time, schedule frequency, scheduled workflows being disabled after 60 days without activity), GitHub Pages limits (site size, bandwidth) and whether Pages is free for public repositories.
7. How GitHub renders README images: is `picture` with `source media="(prefers-color-scheme: dark)"` supported and does it follow the viewer's GitHub theme, which HTML tags and attributes survive, how SVG files referenced by `img` are served (are scripts, external fonts and CSS animations inside the SVG allowed), and the older `#gh-dark-mode-only` method's status.
8. Free homes for public research data, with current limits and terms: Hugging Face Hub dataset repositories (storage limits for free public repos, file size limits, any 2025 or 2026 changes), Zenodo (size per record, DOI, versioning, who runs it), Internet Archive, OSF, Software Heritage, Cloudflare R2 free tier, Codeberg or GitLab LFS quotas. For each: the limit, whether it gives a stable link and a checksum, and whether an account or sign-up is needed to download.
9. How a file stored with Git LFS in a public repository can be linked and downloaded directly (the stable raw or media URL form), and whether a link can be pinned to a commit.
