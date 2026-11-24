# Notes: grouping, categories and tags (cls)

## Restart status

The part folder was empty at restart: no earlier lines to check or keep. Every line is from this session.

## Findings that matter most

1. **Large curated lists generate their views from one file per item.** awesome-selfhosted (95 categories, a 331,000-character README) does this (cls-c31). best-of-generator does too, and warns of GitHub's 512 KB README limit (cls-c33).
2. **awesome-selfhosted-data is the closest working model of a fixed tag list.** Each tag is a file with a description and a `redirect`. A tag needs 3 or more projects, an entry shows under its first tag, and stale entries are flagged automatically (cls-c32).
3. **arXiv shows the primary-plus-cross-list idea in practice.** Its rule is "one or two" cross-lists (cls-c02). Moderators can reclassify even after posting (cls-c03), and the primary category goes to "which single community is the most important set of readers" (cls-c07).
4. **Choosing a primary category is error-prone.** arXiv's classifier disagreed with the author's choice on 17.4% of papers, and authors took its suggestion 67.5% of the time (cls-c06).
5. **Fixed vocabularies change slowly but steadily.** arXiv made about 17 taxonomy changes in 22 years (splits, merges, aliases) (cls-c04). MeSH ships yearly, with 160 new descriptors in 2026, admitted on literary warrant (cls-c36).
6. **Gated free tags still sprawl.** Despite a 1,500-reputation gate, Stack Overflow had 38,205 tags in 2014, 25.74% used fewer than 10 times (cls-c23). Culling single-use tags was "a band-aid" (cls-c24).
7. **Ungated tags sprawl more.** GitHub had over 118K unique topics in 2020, yet only 5% of public repositories used any. Featured topics were 355, with 777 aliases (cls-c26, cls-c27).
8. **Hybrids are normal.** Hugging Face validates task, license and language but leaves `tags` free (cls-c28).
9. **Wikipedia controls categories by rules, not a fixed list.** Categories must be "defining", with no "other" buckets, and changes are discussed for 7 days (cls-c17 to cls-c19). The result is a graph with cycles (cls-c21, cls-c22). Lists sit beside categories (cls-c20).
10. **People store by folder and one label.** Users preferred folders, gave one tag per item and rarely searched by several (cls-c39). One dissertation found no performance gap (cls-c40).
11. **Polyhierarchy is common where curators are professionals.** MeSH terms sit in several trees with no primary location (cls-c35), and OWID topics sit in more than one area (cls-c34).
12. **Diátaxis claims completeness for "practitioners in a craft".** Its reference kind means describing the product's machinery. Comparisons and opinions belong to its explanation kind (cls-c13, cls-c14).
13. **Papers with Code redirects (302) to Hugging Face Trending Papers, which has no task grouping** (cls-c08). The data stays under CC BY-SA (cls-c10), and a revival tags papers with AI (cls-c11). The 2025-07-24 shutdown date is from secondary pages only (cls-c09).

## Hypotheses

- **H1 (flat store, tags in metadata, generated index): holds, with a qualification.** For: cls-c31, cls-c32, cls-c33, cls-c20, cls-c37. Against: awesome rules demand a hand-written, non-generated README (cls-c30), and people favour one folder per item (cls-c39). The qualification: every generated example still shows one primary grouping, a first tag or a primary category. "Flat plus tags" works when a generated view gives each item one home.
- **H2 (fixed lists stop sprawl, free tags sprawl): holds, with a qualification.** For: cls-c23, cls-c24, cls-c27, cls-c43, cls-c17. Against: per-item tag proportions stabilise (cls-c41), and the line between free and controlled is less strict than claimed (cls-c42). Fixed lists still grow (cls-c04, cls-c36), so they need an admission rule (cls-c32, cls-c36) and aliases (cls-c26, cls-c32, cls-c01). A fixed list slows sprawl; it does not stop it.
- **H3 (one primary plus optional secondaries is enough): holds, with a qualification.** For: cls-c02, cls-c03, cls-c07, cls-c32, cls-c39. Against: primary choices are often wrong (cls-c06), and professional vocabularies use several homes with no primary (cls-c35, cls-c34). It needs a cap of about 2 secondaries, and someone able to reclassify.
- **H4 (Diátaxis's four kinds do not fit research write-ups): holds, with a qualification.** For: reference is defined as machinery (cls-c14), the kinds blur (cls-c15), and a critic names kinds the model misses (cls-c16). Against: Diátaxis claims completeness (cls-c13), explanation covers comparison (cls-c14), and how-to fits. Benchmarks, datasets and traps have no clear home. I found no source testing Diátaxis on research.

## Could not verify

- Stack Overflow's current tag rules: its help, meta and API hosts were refused by the fetch tool (cls-s31 to cls-s34). Figures are from 2010 and 2015.
- An official Meta or Hugging Face notice of the Papers with Code shutdown. web.archive.org was refused (cls-s13), and Medium returned 403 (cls-s17).
- Diátaxis "complex hierarchies" page: 404 (cls-s20).
- Full texts behind cls-c40, cls-c43 and cls-c21 (snippets only). How Papers with Code governed its taxonomy.
- The GitHub alias count: 777 was read from a garbled rendering. A search snippet agrees.

## Searches that found nothing

- A public arXiv procedure for proposing new categories (cls-s04, cls-s69).
- A measured share of arXiv papers that are cross-listed (cls-s82).
- A numeric guideline on how many facets people can handle (cls-s55). The only figure found was "three or four" in searches (cls-c37).
- An average number of categories per Wikipedia article (cls-s72).
- Any discussion of Diátaxis applied to research notes or reference data (cls-s24).
- npm keyword sprawl: no dedicated search was run.

## Session

Model ID: `claude-opus-5-5`. Effort level: unknown (my session does not show one).
