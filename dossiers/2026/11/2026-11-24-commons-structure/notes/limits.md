# Notes: platform limits and free data homes (prefix `lim`)

Restarted helper. lim-s01 to s83 and lim-c01 to c82 are the earlier helper's, unchanged. lim-s84 to s101 and lim-c83 to c98 are mine.

## Findings that matter most

1. The GitHub web view cuts a folder listing at 1,000 entries (re-checked today). The contents API has the same cap. No doc states the web cut-off. (lim-c25, lim-c26)
2. A rendered page is limited by bytes, not by entries. A README is cut off after 500 KiB. Other files render if they are "generally less than 2 MB". (lim-c27, lim-c28, lim-c88, lim-c89)
3. Folder guidance is 3,000 entries per folder (recommended, not enforced). git-sizer says "a couple of thousand". So 10,000 dossier folders under one parent folder go past the guidance; they need sharding. (lim-c19, lim-c24)
4. For repository size, GitHub recommends under 1 GB ideally, under 5 GB strongly, and 10 GB on disk. A file over 100 MiB is blocked and a push over 2 GB is refused. No limit on the total number of files was found. (lim-c19 to lim-c23, lim-c94, lim-c98)
5. Git LFS is billed to the repository owner, always. Free and Pro get 10 GiB of storage and 10 GiB of bandwidth. Team and Enterprise Cloud get 250 GiB of each. A zero budget blocks LFS for the rest of the month. (lim-c07, lim-c11, lim-c13)
6. Enterprise Cloud is 21 dollars per user per month. A personal account can only be on Free or Pro. Copilot Business, 19 dollars per seat, is another "about 20 dollars" plan, with no storage benefit. (lim-c01, lim-c03, lim-c83)
7. Enterprise storage covers user-owned content only for managed user accounts, which own private repositories only. (lim-c86)
8. A release holds 1,000 files under 2 GiB each, with no total or bandwidth limit. GitHub frames releases for software, and its Acceptable Use Policies allow throttling. (lim-c34 to lim-c36)
9. A Git LFS file in a public repository downloads without sign-in at `media.githubusercontent.com/media/{owner}/{repo}/{commit}/{path}`, pinned to a commit. Its ETag is the file's SHA-256. This is observed behaviour, not documented. (lim-c56 to lim-c59)
10. Zenodo fits archived snapshots: 100 files and 50 GB per record, a DOI for each version plus a concept DOI, MD5 checksums, and CERN as host. Thousands of small files must be bundled. (lim-c67 to lim-c70, lim-c95)
11. Hugging Face gives free accounts "best-effort" public storage. Its stated public limit has changed at least twice since December 2024 (from "unlimited", to 300 GB, then to 1 TB). It wants reusable datasets in formats like Parquet. (lim-c60 to lim-c63, lim-c90 to lim-c92)
12. For public repositories, Actions on standard runners are free, and scheduled workflows turn off after 60 days without activity. Pages is free too: a 1 GB site, 100 GB a month of soft bandwidth, and a 1 GB recommended source repository. (lim-c37, lim-c41, lim-c43, lim-c44, lim-c94)
13. SVGs from the raw host come with a CSP that blocks scripts and outside fonts and allows inline CSS (re-checked today). `picture` is supported. (lim-c46, lim-c52, lim-c53)

## Hypotheses

- **H10: holds with a qualification.** Folder listings break at 1,000 (lim-c25, lim-c26). An index file breaks on bytes: README 500 KiB, other Markdown about 2 MB (lim-c27, lim-c28, lim-c88). Own arithmetic: at 250 bytes a row, about 2,000 and 8,000 rows. Code search skips files over 350 KiB (lim-c30).
- **H12: holds.** Own arithmetic: 10,000 dossiers at a 50 KB cap is about 500 MB raw, under the 1 GB ideal (lim-c20). History grows with each edit, so a file cap does not cap the repository. Folder count, not bytes, breaks guidance (lim-c19). Nothing against in 2 searches (lim-s81, lim-c98).
- **H15: holds with a qualification.** Enterprise Cloud is 21 dollars (lim-c01). LFS bills the repository owner; a personal account has its own 10 GiB (lim-c03, lim-c07, lim-c11, lim-c12, lim-c85). Exception: managed users, private repositories only (lim-c86). Against: Copilot Business at 19 dollars also fits (lim-c83).
- **H16: holds with qualifications.** Zenodo fits best, for DOI snapshots (lim-c67 to lim-c70). Releases fit in size but are framed for software (lim-c34 to lim-c36). Hugging Face is best-effort, changeable and ML-oriented (lim-c91, lim-c92). R2 needs a subscription checkout (lim-c96, lim-c79). The Internet Archive gives stable links and checksums (lim-c74).

## Could not verify

- GitHub Pro's current price. Only the 2020 figure of 4 dollars was found (lim-c84).
- Whether `#gh-dark-mode-only` still works (lim-c97, lim-c48), and whether `picture` follows the GitHub theme or the operating system's setting (lim-c49).
- Git LFS unit, GiB or GB (lim-c08), and an overage rate in a billing doc (lim-c09).
- Whether R2 asks for a card (lim-c96).
- Blocked: Software Heritage, both pages (lim-s62, lim-s63), not retried. A curl of the large-folder page got HTTP 403; the fetch tool read it.

## Searches that found nothing

Nothing official in: lim-s10, lim-s32, lim-s42, lim-s66, lim-s68, lim-s72, lim-s76, lim-s81, lim-s86, lim-s88, lim-s90, lim-s96.

## Earlier lines checked

I re-opened these sources and they matched their claims: s02, s03, s04, s11, s12, s15, s17, s19, s23, s31, s44, s45, s56, s64, s65, s83. Through them I confirmed c01, c07, c10, c11, c13, c19, c21, c25, c27, c28, c32, c34, c41, c44, c49, c52, c55 to c57, c60 to c63, c67, c75.

I did not re-check the other 67 earlier sources or their claims. Those stand on the earlier helper's reading.

## Session

Model ID: `claude-opus-5-5`. Effort: `reasoning_effort 15`, as shown in the session context.
