# How to organise a public research commons so it lasts

**Question:** How should a public, pull-request-driven research commons store, tag, identify, check and license its dossiers so that it still works at 10,000 dossiers?

**Kind:** comparison · **Last checked:** 2026-11-24 · **Re-check by:** 2027-02-24 · **Status, version and who checked it:** [dossier.json](dossier.json), [provenance.json](provenance.json)

> **What this is.** Desk research by seven helper agents and the author (747 sources opened or searched, 540 claims), plus one measured run on synthetic data that took three attempts. Nothing was bought, installed or signed up for. The structure it recommends is the one this repository now uses. Five settings are the owner's to decide, two of them real choices (licences and the data home), listed under [Decisions for the owner](#decisions-for-the-owner). The re-check date is three months out, because prices, quotas and GitHub's Actions rules drive several answers.

## The question

A research commons takes dossiers from anyone by pull request, for years. The structure chosen on day one is expensive to change later: every link, script and habit depends on it. So the question is what to fix now, before the first outside contribution:

- how dossiers are grouped and tagged;
- how a dossier is named, versioned, corrected, replaced or retracted, and how it goes stale;
- what still works at 10, 1,000 and 10,000 dossiers;
- how contributions are checked and reviewed cheaply;
- where big data goes;
- which licences apply.

**What good looks like:** a stranger can contribute from the template alone; the owner reviews a pull request in a few minutes; nothing needs to move or be renamed at 10,000 dossiers.

## Summary

1. **Store by ID, browse by tag.** Each dossier is one folder under its creation month, `dossiers/YYYY/MM/<YYYY-MM-DD-slug>/`, and its tags live in a small card file, `dossier.json`. The folder never moves. Grouping comes from a generated index with a page per tag. nixpkgs left topic folders for name shards because packages fit several categories (com-c037); winget shards by name (com-c041); awesome-selfhosted generates its lists from one file per entry (cls-c31, cls-c32). Sharding by date is my own choice: no project studied does it. **Confidence: high** for an ID-keyed store with tags; **medium** for the date-based ID and shards.
2. **Four fixed tag lists** (domain, topic, kind, stack), each value with a one-line meaning, a "three dossiers" rule for new values, and retire-and-redirect instead of delete (cls-c32, cls-c26, cls-c36). Freshness and trust are worked out by scripts, never typed in. A dossier names one main domain and up to two more, as arXiv does with cross-lists (cls-c02, cls-c07).
3. **Change is logged, never hidden.** Small fixes are edits with a history entry; a changed conclusion is a new dossier that supersedes the old one, both marked; a retracted dossier stays, with a notice and a reason (idv-c22, idv-c29, idv-c38, idv-c45). Each dossier carries a re-check date shown at its top, and the index flags it stale on that date (idv-c64, idv-c93).
4. **It scales on GitHub.** On one cloud machine with small synthetic dossiers, the pull request check took 0.6 s and the full index build 0.7 s at 10,000 dossiers, and no rendered page or store folder came near GitHub's limits (a-c01, a-c03, a-c05). The 7.8 MB index.json is a data file for tools, not a page (a-c04). The index lives on its own branch, so pull requests never conflict over it (con-c01, con-c11, com-c013).
5. **Big data, and the quota question.** About $20 a month fits GitHub Enterprise Cloud at $21 per user. But Git LFS is always billed to the account that owns the repository, and a personal account gets 10 GiB of storage and 10 GiB of download a month, not 250 GiB (lim-c01, lim-c07, lim-c11, lim-c12). For public data, I recommend GitHub release files plus Zenodo snapshots over LFS (lim-c34, lim-c67).
6. **Licences:** three options below; I recommend CC BY 4.0 for text, MIT for code and CC0 for data the commons makes itself. The owner picks.

## How to read the evidence

- Every claim in this text carries its ID from [claims.csv](claims.csv), like (lim-c07). The prefix names the helper cluster: `lim` platform limits, `cls` grouping, `idv` identity, `met` metadata, `con` contributions, `lic` licences, `com` large repositories, `a` the author.
- Each claim has a label: **measured** (someone ran it and gives the number), **read-in-source** (read on the thing's own page, spec or code), **vendor-claim**, **anecdote** or **summary-only** (a snippet or a secondhand page). Of 540 claims: 460 read-in-source, 26 measured, 29 summary-only, 17 anecdote, 8 vendor-claim (counted from claims.csv, which includes the correction rows).
- "Read-in-source" means a page says it. It is not a test of behaviour. Prices and limits were read on 2026-11-24 and change often.
- The only timings this research measured itself are the scale runs (a-c01 to a-c07, a-c20, a-c21), on synthetic dossiers. Sizes there are a floor. A few counts (for example PEP 0's size, com-c016) were made by a helper on a public page and are labelled read-in-source.
- The fact-check led to corrections. Where a claim was relabelled or reworded, a new row in claims.csv replaces it (a-c16 to a-c22), and the text cites the new row.
- "I think" marks opinion. "My arithmetic" marks a sum I did from cited numbers.

## Options compared

Three ways to lay out the store. Each was weighed against the questions in the brief; [coverage.md](coverage.md) lists the claims for each cell.

| | A. Topic folders | **B. ID store, card, fixed tags, generated index** | C. One shared catalogue |
|---|---|---|---|
| What it is | `dossiers/apps/testing/<slug>/`: the folder is the category | `dossiers/2026/11/<id>/` plus `dossier.json` tags; an index built after merge groups by every tag | One list file (a README or YAML registry) every pull request edits, free tags |
| Who does it | MDN, The Turing Way (com-c001, com-c035) | nixpkgs, PEPs, Rust RFCs, RustSec, awesome-selfhosted-data, winget (com-c037, com-c014, com-c019, com-c048, cls-c32, com-c041) | Most awesome lists (cls-c30) |
| A dossier in two domains | Has to pick one folder, or be copied | Lists both; shows on both tag pages | Listed twice by hand |
| Renames and moves | Moving a topic breaks every link; MDN keeps 17,637 redirect lines (com-c004) | Never moves: the ID holds the creation date, the one part that never changes (idv-c75) | Entries move inside one file |
| Merge conflicts | Low | Low: one folder per pull request, nothing shared (con-c01) | High: every pull request edits one file (con-c01, con-c03); GitHub's merge button has no stated support for union merges (con-c16) |
| At 10,000 | A popular topic folder passes GitHub's 1,000-entry listing (com-c024) | A month folder held 79 entries with dates spread over 11 years, and 170 over 5 years (a-c05, a-c21); index pages split by year | The file passes GitHub's 500 KiB README cut-off (lim-c27, cls-c33). My arithmetic: at about 100 bytes a row, near 5,000 entries |
| Tag sprawl | Folders sprawl like tags, with no aliases | Fixed lists, an entry rule and redirects (cls-c32) | Free tags sprawl (cls-c23, cls-c27) |
| Against it | | People find one folder per item easier than tags (cls-c39); choosing one main home is not always easy (a-c17) | |
| Verdict | Fails on two-domain dossiers and on renames | **Pick** | Fails on conflicts and size |

## Recommendation

**Pick B.** Confidence **high** for the ID-keyed layout, the fixed tags and the generated index; **medium** for the date-based ID and month shards (my design: the cited projects shard by name or number, and the collision evidence is anecdotal), the review workflow (it can't run until the token exists) and the data home (quotas change).

Each part, the main alternative it beat, and why:

| Part | Pick | Rejected | Why |
|---|---|---|---|
| Store | `dossiers/YYYY/MM/<id>/` | Topic folders; one flat folder | Shards come from the ID, never the topic (com-c041); flat folders pass GitHub's 1,000-entry view (com-c039) |
| ID | `YYYY-MM-DD-slug`, set once by the generator, never changed | Running numbers; pull request numbers | Running numbers collide silently between open pull requests (idv-c07, idv-c87); pull request numbers need a rename after opening (idv-c20). Date and slug can still collide on one day (idv-c08); my reasoning, not tested here, is that git then reports a conflict, because both pull requests add the same folder |
| Title | Free to change | Slug tracks the title | Renaming the folder would break links. The trade-off: the slug keeps the first wording forever, which idv-c98 warns against. A short, plain slug keeps that cost small |
| Tags | `dossier.json`, a JSON side file | YAML or JSON front matter | Node reads JSON with no dependency and has no YAML reader (met-c48). I expect JSON front matter would show as raw text at the top of a dossier on GitHub (not tested). No report of side files drifting was found (met-c51) |
| Facets | domain, topic, kind, stack; freshness and trust worked out | Diátaxis's four kinds as the kind list | Diátaxis's reference kind means a product's machinery, so benchmarks and datasets have no clear home; its explanation kind does cover comparisons (cls-c14) |
| Two domains | First domain is the main one, up to three in all | No primary; unlimited | arXiv advises against more than one or two cross-lists (cls-c02); a main home keeps a generated view readable (cls-c32) |
| Index | Built after each merge and daily, published to an `index` branch | Committed in each pull request | Shared generated files conflict (con-c01); PEP 0, the RFC book and tldr build theirs and never commit them (com-c013, com-c020, com-c025); no GitHub page says the Actions token can push past a protected main, and users report needing an App or a personal token (con-c65) |
| Change | History in the card; append-only sources and claims; supersede and retract, never delete | Edit freely; delete | ADRs, PEPs, Rust RFCs, arXiv, DataCite and ICMJE all keep the old record and mark it (idv-c18, idv-c22, idv-c29, idv-c38, idv-c42, idv-c45) |
| Freshness | Re-check date at the top of each dossier and in the card; stale worked out daily | A date in the footer; one fixed cycle for everything | In one NHS test, readers missed review dates near the footer (idv-c64); Cochrane dropped fixed two-year cycles (idv-c68), though docs projects run 90 or 180 day checks (idv-c93, idv-c94). Each dossier sets its own date, 12 months at most |
| Review | CI first; a trusted re-check from `main`; a Claude review that posts one verdict; the owner merges | `pull_request_target` | GitHub blocks `pull_request_target` by default in public repositories from 2026-12-02 (con-c31, a-c15) |

**What would change the answer:** GitHub raising its 1,000-entry folder view or its page limits (would make sharding less needed, but the layout still works); a contributor base that wants Diátaxis kinds (add a facet, don't change folders); a big shift in the quotas below.

## Evidence

### 1. Grouping and tags

**Folders or tags.** nixpkgs moved from a category folder tree to `pkgs/by-name/<two letters>/<name>/`, because contributors kept asking which category a package belonged to (com-c037). winget-pkgs shards by the first letter of the publisher, "to make navigation easier on GitHub" (com-c041). PEPs sit in one flat folder and the index reads each file's header (com-c012); PEP 0 groups them by status and type (com-c014). awesome-selfhosted, one of the largest curated lists, keeps one YAML file per entry and generates its README and site from them (cls-c31). Against this: in two studies people preferred folders to tags for their own files, and gave one tag per item (cls-c39). I think that finding fits personal files better than a public index, but it is why every generated view here gives each dossier one main home.

**Keeping a fixed list small.** Gated free tags still sprawl: Stack Overflow had 38,205 tags in 2014 despite a 1,500-reputation gate, and a quarter were used fewer than 10 times (cls-c23). GitHub had over 118,000 topics in 2020 (cls-c27). Fixed lists grow too: arXiv made about 17 taxonomy changes in 22 years (cls-c04), and MeSH added 160 terms in its 2026 release, admitted on use in the literature (cls-c36). The closest working model is awesome-selfhosted-data: each tag is a file with a description, a tag needs three or more entries, and a `redirect` field retires a tag without breaking it (cls-c32). Hugging Face mixes fixed and free fields, validating task, licence and language against lists (cls-c28, met-c16). The commons copies these rules: a `means` line per value, three planned dossiers for a new value, its own pull request, and `retired` plus `use_instead` instead of deletion ([tags/README.md](../../../../tags/README.md)).

**Which facets.** The owner's plan names domain, topic, kind, stack, re-check date and trust (a-c13). Domain follows the onRails packs (a-c14). Re-check date and trust are better worked out than typed: the index computes stale from the date, and trust from the provenance record (fact-checked in a fresh session, or cross-checked on a different model). Diátaxis claims its four kinds cover every need of "practitioners in a craft" (cls-c13). Its explanation kind does allow weighing alternatives, so a comparison fits there; but its reference kind describes a product's machinery, and a benchmark or a dataset has no clear place (cls-c14). One critic says it also misses overviews and examples (cls-c16). So the kind list is the owner's five: comparison, how-to, trap, benchmark and dataset. Each kind has its own required sections, which the checker enforces.

**A dossier in two domains.** arXiv lets authors add cross-lists, advises against more than one or two, and lets moderators reclassify (cls-c02, cls-c03). It picks the primary by asking which single community is the main audience (cls-c07). Choosing is not always easy: when arXiv began showing a classifier's suggestion, 17.4% of papers got one and two thirds of those authors took it (a-c17). MeSH puts a term in several trees with no primary (cls-c35), and Our World in Data lists some topics under more than one area (cls-c34). The commons takes arXiv's rule: the first domain is the main home, up to three in all, and the maintainer can re-tag any dossier with a history entry.

### 2. Identity and change

**Stable IDs.** Running numbers collide: two pull requests in the MADR repository both created record 6 and both merged, a "silent duplicate" no merge conflict caught (idv-c07, idv-c87). Projects avoid this three ways: take the number from the platform (Rust RFC numbers are pull request numbers, idv-c20; Kubernetes uses issue numbers, idv-c23), use a date and a slug (log4brains switched after a merge conflict, idv-c12), or add a random suffix (reno, idv-c85). The W3C's note on stable addresses names the creation date as the one part of an address that never changes, and says to keep subject and status out (idv-c75). Date-plus-slug can still collide on the same day (idv-c08, idv-c79). The generator refuses an ID that already exists. My reasoning, not tested here: if two open pull requests pick the same ID, both add files at the same paths, and git reports a conflict on the second.

**Versions and corrections.** The two-tier rule is common: small fixes in place, a changed conclusion as a new record (idv-c18, idv-c22). DataCite keeps one DOI for minor changes with a raised version, and a new DOI for major ones (idv-c41). RFCs never edit; errata sit beside the text (idv-c32), and Crossref says not to modify the original (idv-c49). The commons takes the middle: text can be corrected, but every merged change adds a history entry with its reason, the version goes up on a correction or re-check, and `sources.csv`, `claims.csv`, `fact-check.csv`, run folders and briefs are append-only, checked against the merge base. Git keeps every earlier version, and a commit link is a citable fixed version, the way the Stanford Encyclopedia of Philosophy keeps fixed quarterly editions (com-c052).

**Superseding.** PEPs record it on both sides, `Superseded-By` on the old and `Replaces` on the new (idv-c29), and DataCite has paired relations such as `Obsoletes` and `IsObsoletedBy` (idv-c40). Others mark only one side: an RFC's header names what it obsoletes, and the style guide doesn't say how the older RFC is marked (idv-c33); Rust adds a note to the original (idv-c22). The checker requires both sides, and lets one pull request carry the new dossier plus the old one's status change and notice, the one exception to "one dossier per pull request".

**Retractions.** A retracted item stays, labelled, with a reason (idv-c38, idv-c45). DataCite says a DOI is never deleted; it points at a tombstone page (idv-c42). Several also allow real removal for legal, privacy or copyright reasons, and keep the ID and a tombstone (idv-c44, idv-c51, idv-c55); arXiv says an announced paper cannot be completely removed (idv-c38). So: a retracted dossier keeps its folder, its card says why, and its text starts with a notice. Removal for legal reasons is the maintainer's job and leaves a tombstone.

**Freshness.** Review dates are often missed: of Australian guidelines that stated one, about 30% were past it with no update (idv-c66), and a study's abstract reports that only 20.5% of obsolete Stack Overflow answers were ever updated (a-c18). Cochrane gave up fixed two-year cycles for updating by need (idv-c68). What helps: a date shown next to the content, not in the footer (one NHS test, idv-c64); a reviewed date kept apart from the last-edit date (idv-c92); a stamp only a real re-check may move (idv-c94); and a script that works out staleness and reports it (idv-c93, idv-c88). The commons does all four: `**Last checked:**` and `**Re-check by:**` sit at the top of each dossier and must match the card; `checked` moves only with a "rechecked" history entry; the re-check date is at most 12 months out (a warning past 6); and the index rebuilds daily with a stale page.

### 3. Scale

**GitHub's limits.** The web view lists only 1,000 entries in a folder (lim-c25, com-c024). GitHub recommends at most 3,000 entries per folder and a repository under 1 GB ideally, 5 GB strongly (lim-c19, lim-c20). A README is cut off after 500 KiB, and other Markdown renders when it is "generally under 2 MB" (lim-c27, lim-c28). Code search skips files over 350 KiB (lim-c30).

**What I measured.** Synthetic commons of 10, 1,000 and 10,000 small dossiers, one 4-vCPU cloud machine, three runs each ([summary](summaries/cloud-linux-4cpu.md)):

| | 10 | 1,000 | 10,000 |
|---|---|---|---|
| Pull request check, median (a-c01) | 89 ms | 136 ms | 606 ms |
| Check everything, median (a-c02) | 84 ms | 802 ms | 7.1 s |
| Build the index, median (a-c03) | 84 ms | 153 ms | 695 ms |
| index.json (a-c04) | 8.6 KB | 784 KB | 7.8 MB |
| Largest index page (a-c05) | 5 KB | 18 KB | 179 KB |
| Most entries in one store folder, dates over 11 years (a-c05) | 9 | 12 | 79 |

The folder count depends on how many dossiers start in one month: run 1, with the same 10,000 dated over 5 years, had 170 (a-c21). The three runs of each timing varied by up to 30% (a-c20). The second run found a real limit: with 10,000 dossiers nearly all stale, the stale page reached 1.8 MB, near GitHub's render limit (a-c06). The stale and changes pages now split by year past 300 rows, like the tag pages, and the third run shows the largest page at 179 KB. Two earlier runs failed on my own harness mistakes; their files are kept as they came, and their manifests say why.

**What this means.** Others agree that one index stays usable at this size: MDN serves a 14,762-entry search index in 1.5 MB (com-c003), PEP 0 lists 749 PEPs on one 420 KB page (com-c016), and Fuse.js says its own search takes about 7 ms at 10,000 records (a-c19).

**Two caveats.** First, the synthetic dossiers are about 5 KB (a-c07); this first real one is about 500 KB. A full check reads every dossier's files, so with real dossiers it will be much slower than 7 s; the pull request check reads one dossier, so it is affected far less. tldr shows a full check of about 40,000 small files can still run in one to two and a half minutes (com-c027). Second, size. My arithmetic: at an average of 100 KB, 10,000 dossiers come to about 1 GB, GitHub's "ideal" line (lim-c20); at this first dossier's size it would be nearly 5 GB, GitHub's "strongly recommended" limit, before git history. So the checker caps a file at 400 KB and a dossier at 1 MB, warns from 250 KB, and big data goes out to a data repository. If the average grows, the next step is moving the source and claim tables of large dossiers out too.

**One trap avoided.** A required check that a path filter skips stays "Pending" and blocks the merge (com-c009). The checks here run on every pull request and decide inside the job what to check.

### 4. Contributions, CI and review

**One item per pull request, bots first.** Repositories with many small contributions keep review cheap with rules and bots: winget-pkgs takes exactly one package version per pull request (con-c77); DefinitelyTyped had about 250 pull requests a week and let package owners' approvals trigger a bot merge (con-c73). Review bots raised merged pull requests in one study (con-c86). Google's small changes get first feedback in under an hour (con-c85), though a study of 845,316 pull requests found size unrelated to time-to-merge (con-c84). So the commons enforces one dossier per pull request, a separate pull request for a new tag value, and no tooling changes mixed in.

**What CI checks** ([scripts/check.mjs](../../../../scripts/check.mjs)): the card against its schema and the tag lists; the provenance record (an author and a fact-check in a different session, every model and effort exact or `unknown` with a reason); every claim's label and sources; kind-specific sections; template blanks; dates at the top matching the card; append-only files against the merge base; size and file-type limits; secrets, e-mail addresses, home-folder paths, hidden characters and HTML comments; and a private-terms list the maintainer keeps as a secret. Links in a changed dossier are checked separately; a 404 fails, and a site that refuses the checker only warns, because a link checker can do little against bot blocks (con-c70) and its makers advise caching and excluding strict hosts (con-c69).

**Forks and secrets.** A pull request from a fork gets no secrets and a read-only token (con-c24). `pull_request_target` runs in the base repository's context with secrets (con-c25) and skips the approval gate (con-c29), and GitHub will block it by default in public repositories from 2026-12-02 (con-c31, a-c15). A `workflow_run` workflow can use secrets and a write token even when the run that triggered it could not (con-c26). `secrets` can't be used in an `if:`; the documented way is an environment variable (con-c27).

**The Claude review.** claude-code-action skips fork pull requests by default, and the step still succeeds (con-c34, a-c08). It checks that the person who started the run has write access, including the author of the upstream run for `workflow_run`; `workflow_dispatch` needs write access to start at all (a-c09). Prompt injection through pull request text into AI agents in CI is documented in vendor reports and research from 2025 and 2026 (con-c49, con-c50, con-c52), and Anthropic's own security-review action says it is not hardened against it (con-c48). In auto mode a tool allowlist is not strict unless a permission mode is set (con-c42). So [review.yml](../../../../.github/workflows/review.yml):

1. runs from `main` after CI, re-runs the checker from `main` on the pull request's files (fetched as data, never run) and sets a `trusted-check` status;
2. runs Claude only for authors with write access, or when the owner starts it for a stranger's pull request (one click, or `gh workflow run review.yml -f pr=<n>`);
3. gives Claude read-only tools with `--permission-mode default`, and takes its verdict as structured output;
4. posts the verdict from a separate job that holds the write token, as one comment that names the commit;
5. skips cleanly, with a note, until the `CLAUDE_CODE_OAUTH_TOKEN` secret exists.

**Protecting `main`.** Rulesets, branch protection and CODEOWNERS work on a public repository on GitHub Free (con-c57, re-read in a-c16). But an author can't approve their own pull request (con-c62), and teams in CODEOWNERS need an organisation (con-c58). So while the owner is the only maintainer, the ruleset should require a pull request and the `check` and `trusted-check` statuses, not an approval. CODEOWNERS can name trusted reviewers per folder later. Secret scanning is free and automatic on public repositories, pull request text included (con-c67).

### 5. Big data and the LFS question

**The owner's plan.** About $20 a month fits GitHub Enterprise Cloud at $21 per user per month (lim-c01); Copilot Business at $19 a seat also fits, and the part of its page read lists no storage benefit (lim-c83). GitHub's docs describe no way to put a personal account's own repositories on Enterprise (lim-c05). I could not read the owner's plan from here (a-c12).

**The quota.** A personal account is always on Free or Pro (lim-c03). Git LFS storage and bandwidth are always charged to the account that owns the repository, and forks and clones use the owner's bandwidth (lim-c11). Free and Pro accounts get 10 GiB of storage and 10 GiB of download a month; Team and Enterprise Cloud accounts get 250 GiB of each (lim-c07). No GitHub page says an enterprise's allowance covers a member's personal repositories (lim-c12); the one exception, managed user accounts, can only own private repositories (lim-c86). **So a data repository owned by the personal account gets 10 GiB of storage and 10 GiB of download a month.** To use 250 GiB it would have to be owned by an organisation inside the enterprise. With a $0 budget, going over blocks LFS for the rest of the month (lim-c13), which for public data means every reader's download stops.

**Free homes.**

| Home | Limits | Fit |
|---|---|---|
| GitHub release files in a public data repository | 1,000 files per release, each under 2 GiB; no stated total or bandwidth limit (lim-c34) | Good: stable URLs per tag. GitHub frames releases for software, and can throttle heavy hosting (lim-c35, lim-c36) |
| Zenodo | 100 files and 50 GB per record; a DOI per version and one for all versions; run by CERN (lim-c67, lim-c69) | Good for citable snapshots; bundle many files |
| Git LFS in a data repository | 10 GiB storage, 10 GiB download a month on a personal account (lim-c07) | Poor for public data: every download counts against the owner |
| Hugging Face Datasets | "Best-effort" public storage for free accounts; the stated limit changed at least twice since late 2024 (lim-c60, lim-c91) | Fair for machine-learning data in Parquet (lim-c63) |
| Internet Archive | Stable `archive.org/download/...` links with checksums; upload needs an account (lim-c74) | Fair as a mirror |
| Cloudflare R2 | Free tier, but needs a subscription through a checkout (lim-c96) | Out: a paid-plan checkout, even for the free tier |

**Recommendation:** a public data repository whose files are GitHub release files, one release per dataset version, with Zenodo snapshots for data people should cite. Releases need nothing new. Zenodo and the Internet Archive need a free account to upload (lim-c74), which is a sign-up and the owner's call. Use LFS only for small files that are rarely downloaded, if at all. Each dossier's `data.json` holds the link, SHA-256, size, licence and how the file was made, with field names from the Frictionless Data Package (met-c02). Frictionless defaults a bare hash to MD5, so the schema requires `sha256:` (met-c04). Our World in Data works the same way: metadata and pointers in git, files in object storage (met-c42). The monthly LFS watch in the owner's plan still applies if LFS is used; it needs a token with billing access, which is a setup step for later.

### 6. Licences

Text, code and data are commonly licensed apart: GitHub Docs uses CC BY 4.0 for content and MIT for code (lic-c09), The Turing Way the same (lic-c13), MDN CC BY-SA for prose and CC0 for code samples (lic-c08), and Wikidata CC0 for data and CC BY-SA for text (lic-c06). Share-alike is common among documentation projects: Wikipedia, MDN, Diátaxis, GNOME and OpenStreetMap (lic-c05, lic-c08, lic-c12, lic-c22, lic-c19). That partly refutes my hypothesis that it is rare: it is common among documentation projects, though not shown to be the majority. Creative Commons advises against its licences for software, except CC0 (lic-c28). Facts are not protected in the US (lic-c42); the EU adds a 15-year database right (lic-c43).

**AI-written text.** In the US, purely AI-generated material is not protected, while human selection, arrangement and edits can be (lic-c57); EU member states broadly agree, in a Council summary that is not law (lic-c60). The UK still protects computer-generated works, though a 2026 report proposes ending that (lic-c61). Creative Commons says a CC licence covers the human contribution, and encourages CC0 where human creativity is low (lic-c62). My reading, not legal advice: on a dossier an agent drafted and a person reviewed, a CC BY licence binds only the human parts.

**Contributions.** GitHub's terms make contributions inbound equal outbound: content added to a repository with a licence is licensed under the same terms (lic-c51). The Developer Certificate of Origin is the light extra step if wanted (lic-c53). Upstream data keeps its own licence, recorded per file, as Our World in Data does (lic-c01, lic-c04).

| Option | Text | Code (scripts) | Data the commons makes | Trade-off |
|---|---|---|---|---|
| **1. Attribution (recommended)** | CC BY 4.0 | MIT | CC0 1.0 | Matches GitHub Docs and The Turing Way. Reusers must credit text; data reuse has no strings, which avoids attribution stacking (lic-c65). Credit for data is asked, not required (lic-c34) |
| 2. Share-alike | CC BY-SA 4.0 | MIT | ODbL 1.0 | Matches Wikipedia, MDN and OpenStreetMap. Keeps improvements open, but blocks reuse in closed products and mixes poorly with other licences (lic-c65, lic-c70) |
| 3. Public domain | CC0 1.0 | MIT (or 0BSD) | CC0 1.0 | Simplest, and sidesteps the AI-authorship question (lic-c62). Gives up any legal right to credit |

GitHub's licence detection names no single licence when root licence files differ, but lists them all (lic-c47); its docs suggest explaining several licences in the README (lic-c49). The plan: `LICENSE` for the text, `LICENSE-CODE` for scripts, and a licence line in each data file's record.

### 7. Prior art at a glance

| Project | What the commons takes from it |
|---|---|
| Our World in Data | Per-origin licence and access date; metadata in git, files elsewhere (lic-c04, met-c41, met-c42) |
| arXiv | A main category plus one or two cross-lists; moderators can reclassify; withdrawals stay visible (cls-c02, cls-c03, idv-c38) |
| Papers with Code | A warning: the site now redirects to Hugging Face, and its task grouping is gone (cls-c08) |
| Wikipedia categories | "Defining" traits only, no "other" buckets, changes discussed first (cls-c17) |
| Diátaxis | Kinds by what the reader came to do, but its four don't cover research (cls-c13, cls-c14) |
| Frictionless Data | Field names for data links: path, bytes, hash, licenses (met-c02) |
| Hugging Face cards | Some metadata fixed and checked, some free (cls-c28, met-c13) |
| schema.org and DataCite | DataCite's `Report` and `Dataset` types and its relations for versions, sources and superseding (met-c30, met-c31, idv-c40). schema.org's `supersededBy` is for vocabulary terms, not writing (met-c26) |
| Decision records and PEPs | Supersede on both sides; record once accepted, fix small things only (idv-c29, idv-c18) |
| Awesome lists | Generated views from one file per entry; a tag needs three entries; stale entries flagged (cls-c31, cls-c32, cls-c33) |
| nixpkgs, winget, Homebrew | Shard folders by name or ID, never topic (com-c037, com-c041); Homebrew splits by first letter, reason not found (com-c042) |

### 8. Hypotheses, checked

The hypotheses were committed before the first search ([hypotheses.md](hypotheses.md)).

| ID | Hypothesis, short | Verdict | Evidence |
|---|---|---|---|
| H1 | Flat store plus tags beats a folder tree | Holds, with a qualification: any subfolders should be ID prefixes, and each item needs one main home in a view | com-c037, com-c041, cls-c31, cls-c39 |
| H2 | Fixed lists stop sprawl | Holds, with a qualification: they slow it; lists still grow, so they need an entry rule and aliases | cls-c23, cls-c27, cls-c04, cls-c32 |
| H3 | One primary plus secondaries is enough | Holds, with a qualification: cap the secondaries, and let a maintainer reclassify | cls-c02, cls-c03, a-c17 |
| H4 | Diátaxis doesn't fit research | Partly holds: how-to and comparison fit its kinds; benchmarks and datasets don't | cls-c13, cls-c14 |
| H5 | Tags in a JSON side file | Holds, with a qualification: JSON front matter is also dependency-free | met-c48, met-c49, met-c51 |
| H6 | Date plus slug beats running numbers | Holds, with a qualification: same-day collisions remain, so CI and git must catch duplicates | idv-c07, idv-c08, idv-c12, idv-c87 |
| H7 | Fix in place; new record for a new conclusion | Holds, with a qualification: some never edit and log errata instead | idv-c22, idv-c32, idv-c49 |
| H8 | Retracted means kept, never deleted | Holds, with a qualification: legal removal exists everywhere, with a tombstone | idv-c45, idv-c42, idv-c51 |
| H9 | Re-check dates plus a script | Holds, with a qualification: dates are often missed unless shown and owned | idv-c66, idv-c64, idv-c93 |
| H10 | One index page breaks near 1,000 | Weakened for the index, holds for folders; an unsplit stale page did reach 1.8 MB (a-c06) | com-c016, a-c05, a-c06, com-c024 |
| H11 | A shared generated file conflicts | Holds | con-c01, con-c11, com-c013 |
| H12 | Checking only changes keeps CI flat | Weakened: the pull request check still grew from 89 to 606 ms; checking everything was cheap on small synthetic dossiers (not yet on real ones), and cross-item checks need it | a-c01, a-c02, com-c027, com-c007 |
| H13 | Fork pull requests get no secrets | Holds | con-c24, con-c34, a-c09 |
| H14 | Rules and bots keep review cheap | Holds, with a qualification: size alone doesn't predict merge time | con-c77, con-c73, con-c84 |
| H15 | About $20 is Enterprise; its quota skips personal repositories | The billing rules hold; the owner's actual plan is unverified, and Copilot Business also fits the price | lim-c01, lim-c11, lim-c12, lim-c83, a-c12 |
| H16 | Free homes fit public data | Holds, with qualifications: Zenodo and releases fit; Hugging Face is best-effort | lim-c34, lim-c67, lim-c60 |
| H17 | Follow Frictionless for data files | Holds, with a qualification: write `sha256:` explicitly | met-c02, met-c04 |
| H18 | CC BY text, MIT code, CC0 or CC BY data; share-alike rare | Partly refuted: share-alike is common in documentation | lic-c09, lic-c13, lic-c05, lic-c08 |

## Decisions for the owner

| Question | Recommendation | Why it is yours |
|---|---|---|
| Which licences | Option 1: CC BY 4.0 text, MIT code, CC0 data | It sets what everyone may do with the commons, for good |
| Where big data goes | Release files in a public data repository, plus Zenodo snapshots; LFS only if needed | It decides quota risk and whether readers can always download |
| Ruleset on `main` | Require a pull request and the `check` and `trusted-check` statuses; no required approval while you are the only maintainer | Repository settings are outside the code |
| Private terms | Add a `PRIVATE_TERMS` secret listing private names the checker must refuse | Only you know the list |
| Review model | `REVIEW_MODEL` variable, default `claude-opus-5-5` | It spends your subscription |

## Gaps

- **The owner's plan** could not be read from this session (a-c12), so the LFS answer rests on GitHub's billing rules, not on the account.
- **Real dossiers were not timed.** The scale runs used small synthetic ones; full checks of real ones will be slower.
- **The review workflow has not run.** It needs the token, and a pull request after it is on `main`, because `workflow_run` workflows only run from the default branch.
- **The 60-day rule.** GitHub turns off scheduled workflows in a public repository after 60 days with no activity (lim-c41). If nothing merges for two months, the daily stale rebuild stops until the owner turns it back on.
- **Not verified:** whether `<picture>` follows the viewer's GitHub theme or their system setting (lim-c49); whether GitHub still renders YAML front matter as a table (met-c43); GitHub Pro's current price (lim-c84); whether GitHub's merge button honours `merge=union` (con-c16).
- **A source that went away the same day:** the link check after the fact-check found the OSF storage-limits article now redirects elsewhere, so lim-c75 is unchecked (a-c22). It is not used in the text.
- **Pages that refused the fetch:** COPE, NICE, Stack Overflow's help and meta sites, go-fair.org, the European Commission's database page, Software Heritage. Claims that rest on snippets instead are labelled summary-only.
- **Helpers stopped at a usage limit.** Seven helpers on one model stopped partway; seven on another model finished the work. Each restarted helper re-opened some earlier sources and lists in its notes which ones it did not; those earlier lines rest on the first helper's reading.
- **Searches that found nothing:** a public arXiv procedure for new categories, a measured share of cross-listed papers, a numeric guideline on facets, studies of stale documentation rates in software, a Node core YAML proposal, side-car metadata drift, and an official GitHub statement on `merge=union`.

## Fact-check

A fresh session checked this dossier on 2026-11-24: a subagent that never saw the author's work, on a different model from both author passes (`claude-sonnet-5-5`), from [its brief](briefs/fact-check.md) alone. It read all 174 claim IDs cited here against the sentences that cite them, re-opened 61 source pages (60 readable), and recomputed the claim counts and the scale table.

- **34 findings: 0 blocking, 17 should-fix, 17 minor.** It found no wrong fact behind the layout, licence or data-home recommendations. The LFS quota and plan facts in section 5 re-checked correctly.
- **What changed:** the source count; the confidence for date-based IDs (now medium); the size and full-check caveats in section 3; the spread in the run summary; overstatements about superseding, removal, Diátaxis, arXiv, the Actions token, the EU position on AI-written text, and schema.org; three claim labels, replaced by new rows a-c17 to a-c19; and the sign-up question for Zenodo and the Internet Archive.
- **Disputed:** one. The checker could not confirm from its fetch that rulesets and code owners work on GitHub Free; the author re-read GitHub's notes, which say they do (a-c16).
- **Not checked by it:** the MDN search index page (its fetch was cut short) and the second half of the Copilot plans page.
- **Not re-checked:** the corrected text did not get a second pass.

Every finding and what was done with it is in [fact-check.csv](fact-check.csv).

## Files

| File | What |
|---|---|
| [dossier.json](dossier.json) | ID, title, tags, status, dates and version history |
| [provenance.json](provenance.json) | Who did each role, on which model and effort |
| [hypotheses.md](hypotheses.md) | What I expected before searching |
| [coverage.md](coverage.md) | Options against questions, with the claims for each |
| [sources.csv](sources.csv) | Every source opened or searched (747) |
| [claims.csv](claims.csv) | Every claim, its label and its sources (540, including corrections) |
| [fact-check.csv](fact-check.csv) | The fact-check's findings and what was done with each |
| [notes/](notes/) | Each helper's own notes: findings, verdicts, what it could not check |
| [runs/](runs/) and [summaries/](summaries/) | The scale runs: manifests, scripts, raw results, the summary |
| [briefs/](briefs/) | The exact brief each role started from |
