# Brief: helper, contribution workflow, CI, review and security

The brief this helper got, word for word. The helper was started with only a pointer to this file and the path of a scratch folder for its part files.

```text
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

## Your cluster: contribution workflow, CI, review and security

ID prefix: `con`. Part folder: the path given in the message that started you.

Hypotheses under test (written before any search):
- **H11.** A generated index file that every pull request regenerates makes open pull requests conflict with each other, so shared generated files should be built after merge, away from contributors.
- **H13.** A pull request from a fork cannot read repository secrets, so an AI review that needs a token cannot run on a stranger's pull request with the plain `pull_request` trigger. A safe design gates it and treats contributed text as untrusted.
- **H14.** Projects with many small contributions keep review cheap by rule: one item per pull request, a template, and machine checks that fail before a person reads anything.

Questions:
1. How the big many-small-contribution repositories work: DefinitelyTyped (its merge bot, owners per package, numbers), Homebrew core, winget-pkgs (manifest folders, validation pipeline, folder partitioning), tldr-pages (one page per pull request? its lint rules), nixpkgs, cdnjs, and the `awesome` list contribution rules. For each: the rule on pull request scope, what the bots check, who merges, and any numbers on volume.
2. Shared files that every contribution touches: the changelog conflict problem and the "fragment" tools made for it (towncrier, changesets, reno, GitLab's changelog entries). What they say about why, in their own docs. Any project that builds an index or site after merge instead of in the pull request.
3. Does GitHub's pull request merge honour `.gitattributes` `merge=union`? Find the official statement or the best evidence.
4. GitHub Actions and forks, from the official docs: which secrets and token permissions a workflow gets on `pull_request` from a fork, how `pull_request_target` and `workflow_run` differ, GitHub's own security guidance on "pwn requests", the "require approval for outside collaborators / first-time contributors" setting, whether the `secrets` context can be used in an `if:` condition at job level or step level, and the documented way to skip a job or step when a secret is not set.
5. The Claude Code GitHub Action (the `anthropics/claude-code-action` repository and the Claude Code docs page on GitHub Actions): the current major version tag, the input names (`claude_code_oauth_token`, `anthropic_api_key`, `prompt`, `claude_args`, `allowed_tools` or their current names), the triggers it supports, what it says about pull requests from forks, its security documentation (prompt injection, who can trigger it, tool permissions), how to restrict its tools, and how it posts a review. Quote the exact input names from `action.yml`.
6. Prompt injection through pull request content into AI review bots: published incidents or advisories (2025 and 2026), and the mitigations vendors recommend.
7. `CODEOWNERS`: syntax, where the file can live, size limits, what an owner needs (write access), how it interacts with required reviews and rulesets, and its limits on a personal-account repository versus an organisation (teams).
8. Protecting `main` on a public repository owned by a personal account on the free plan: are branch protection rules and rulesets available, required status checks, required pull requests, and who can bypass. Can the Actions token push to a protected branch?
9. Link checking in CI: how link checkers such as lychee handle rate limits and bot blocks (403, 429), their advice on caching and excluding hosts, and the false-positive problem. Secret scanning: is GitHub secret scanning and push protection free and on by default for public repositories, and what it covers.
10. Any measured data on review cost: time to review versus pull request size, and bot-first triage results.
```
