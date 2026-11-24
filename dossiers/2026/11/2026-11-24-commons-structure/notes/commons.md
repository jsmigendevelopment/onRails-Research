# Notes: how large text and research repositories are built (prefix `com`)

## Findings that matter most

1. **GitHub's web view lists only 1,000 entries per folder.** tldr keeps about 4,769 pages in one folder and GitHub cuts the listing at 1,000 (com-c024). nixpkgs sized its shards around this limit (com-c038, c039). GitHub recommends at most 3,000 entries per folder (com-c054).
2. **Shards come from the name or the ID, never the topic.** nixpkgs uses two letters, winget and Homebrew one, Cargo 1/2/3/ab-cd, the CVE list buckets of 1,000 IDs, GitHub advisories year and month, and CocoaPods a hash prefix (com-c041, c042, c045, c046, c047, c044).
3. **nixpkgs gave up category folders** because packages fit several categories (com-c037).
4. **Metadata sits next to the text.** MDN uses YAML front matter that rejects unknown keys. PEPs use a header, RustSec TOML front matter, KEPs and OWID a side file, and Rust RFCs a bullet list (com-c002, c012, c048, c051, c031, c019).
5. **Indexes are generated and never committed:** PEP 0, the RFC book and tldr's index (com-c013, c020, c025). PEP 0 groups PEPs by status and type, read from the header fields (com-c014).
6. **One index file still works at about 15,000 records.** MDN serves 14,762 entries in 1.5 MB of JSON (com-c003). Fuse.js measures about 7 ms per search at 10,000 records (com-c058). A single full-text index grows fast: 27 MB for 654 RFCs (com-c022).
7. **Checking everything stays cheap for small text files.** tldr lints about 40,000 pages per pull request in 1 to 2.5 minutes (com-c026, c027). PEPs rebuild all 749 in under 2 minutes (com-c017). The Turing Way takes 4 to 6 minutes for 486 pages (com-c036).
8. **Projects mix changed-only and whole-repository checks.** MDN lints and builds only the changed files (com-c005, c006) but checks the whole redirects file (com-c007). A required check skipped by a path filter stays Pending and blocks the merge (com-c009).
9. **Moves and deletions go through tools.** MDN's move and delete commands write a redirects file of about 17,600 lines (com-c004). OWID adds dated versions and archives the old ones from git history (com-c032).
10. **IDs are assigned at merge.** Pull requests use placeholders such as `0000-` and `RUSTSEC-0000-0000` (com-c019, c048).
11. **Living texts get citable versions.** The SEP publishes fixed quarterly editions and asks readers to cite them (com-c052, c053). The COVID-19 review tags a release for each section (com-c049).
12. **Staleness is visible.** The COVID-19 review marks sections "Suspended" and says it is no longer actively updated (com-c049). KEPs and RustSec have withdrawn and deferred states (com-c051, c048).
13. **Clone cost forced changes** at Homebrew and CocoaPods (com-c043, c044).

## Hypotheses

- **H1: holds, with a qualification.**
  - For: nixpkgs dropped category folders (com-c037). PEPs, Rust RFCs and RustSec store items flat or keyed by name and group them through metadata (com-c012, c014, c019, c048). OWID relies on search (com-c034).
  - Mixed: KEPs use one owner folder plus metadata links (com-c051).
  - Against: MDN and the Turing Way use topic trees (com-c001, c035). A small study found people prefer folders to tags (com-c062). I found no project that left tags for folders (com-c063).
  - The qualification: any subfolders should be name or ID prefixes, not topics.
- **H10: weakened for the index; holds for the store on GitHub.**
  - The index: PEP 0 lists 749 entries on one 420 KB page (com-c016). MDN and Fuse.js handle 15,000 and 10,000 records (com-c003, c058). Lighthouse's DOM warning is a speed cost, not a failure (com-c061). One secondary source advises splitting (com-c064).
  - The store: GitHub's listing truncates at 1,000 entries (com-c024, c039), and many projects shard (com-c041 to c047). git itself coped with 4,769 entries in one folder (com-c024).
- **H12: weakened.**
  - Checking only changed files works for per-item lint and build (com-c005, c006, c008, c018).
  - Checks across items (redirects, links, the index) need the whole repository (com-c007, c036, c065).
  - Full runs stayed near 2 minutes at about 40,000 files (com-c027).
  - A required check skipped by a path filter blocks the merge (com-c009).

## Could not verify

- Why Homebrew shards by first letter. Three searches found nothing (com-s095, s096, s130).
- The Turing Way's review rules. Its CONTRIBUTING.md points to the book, which I did not open (com-s127).
- Whether the PEP pre-commit action checks all files by default.
- An exact OWID step count. The folder listing is truncated (com-s074).
- Blocked pages, from the earlier helper and not retried: api.github.com returned 403 (com-s126), and tldr.sh/assets/index.json returned 404 (com-s058).

## Searches that found nothing

- The earlier helper's, not re-run: com-s062, s095, s096, s119, s123, s124, s125.
- Mine: com-s130, s131, s132, s133.

## Earlier lines

The earlier helper wrote sources but no claims. Every claim here is mine.

- **Re-opened before citing:** com-s001, s004–s013, s015, s018–s024, s026–s029, s033–s041, s044–s047, s049–s051, s055–s057, s060, s063–s067, s070, s071, s074–s079, s081, s083, s085, s086, s088–s091, s094, s098, s099, s101–s103, s105–s115, s117, s118, s120, s122.
- **Not checked:** s002, s003, s014, s016, s017, s025, s030–s032, s042, s043, s048, s052–s054, s058, s059, s061, s062, s068, s069, s072, s073, s080, s082, s084, s087, s092, s093, s095–s097, s100, s104, s116, s119, s121, s123–s126.
- **Cited without re-running:** com-c042 cites the searches s095 and s096, which I could not re-open.

## Session

- Model ID: `claude-opus-5-5`
- Effort level: unknown (my session does not show it)
