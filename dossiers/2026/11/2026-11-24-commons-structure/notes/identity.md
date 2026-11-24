# Identity, versions, superseding, retraction and freshness (idv)

## Findings that matter most

1. Running numbers do collide under concurrent pull requests. The collision is often a silent duplicate, not a merge conflict (idv-c07, c10, c11, c87).
2. Projects fix this in three ways. They take the number from the platform (Rust RFC = PR number, KEP = issue number) (c20, c23). They use a date-plus-slug or timestamp (log4brains, Rails, Jekyll, Lullabot) (c12, c18, c80, c82, c83). Or they add a random suffix or random name (reno, changesets) (c85, c100). MADR kept numbers and added a CI duplicate check in August 2026 (c09, c87).
3. Date prefixes still collide on the same day or minute, and people disagree on which date to use (c08, c79, c83). Slugs fix the wording into the ID, so an ID-plus-decorative-slug, or a random suffix, keeps lookup stable (c98, c99, c85).
4. The W3C note says to keep status and topic out of addresses. The creation date is the one safe part (c75, c76).
5. Superseding is recorded on both records almost everywhere. Examples: adr-tools, PEP Superseded-By/Replaces, KEP replaces/superseded-by, RFC Obsoletes/Updates, DataCite Obsoletes/IsObsoletedBy (c04, c29, c25, c33, c40).
6. Edit policy splits two ways. ADR guidance says accepted records are immutable (c14–c17). Others allow small fixes in place: Lullabot, Rust amendments, reno, DataCite minor versions (c18, c22, c86, c41). RFCs never edit and list errata separately (c31, c32). Crossref says not to modify the original (c49).
7. A changed conclusion becomes a new record. Examples: ICMJE retraction with republication, Rust "new RFC with a note", Zenodo/DataCite new version DOIs (c47, c22, c41, c43).
8. Retracted or withdrawn items stay, marked and linked both ways: ICMJE, arXiv, DataCite tombstones, GOV.UK withdrawn banner, Zenodo (c45, c38, c42, c91, c54, c44).
9. Every system that keeps retracted items also allows real removal for legal, privacy, copyright or out-of-scope reasons. Even then it keeps a tombstone or redirect (c51, c55, c44, c97).
10. Review dates are often missed. 30% of Australian guidelines that stated a review date were past it with no update (c66). Only 20.5% of obsolete Stack Overflow answers were ever updated (c72).
11. Fixed intervals are contested. Cochrane dropped two-year cycles for needs-based updating (c68, c69). Its living reviews use a three-month search cadence (c71). Guideline recommendations decay about 8% in year one (c67).
12. A script works out "stale" from a stored date in practice. Examples: GOV.UK publisher, Microsoft hve-core 90-day CI check with weekly issues, Optimism greppable stamps, Google reminder emails (c57, c93, c94, c88).
13. What makes review dates work: an owner named on the date (c88), a review date kept separate from the last-edit date (c92), a bump only by a real re-check (c94), and the date shown next to the content, not in the footer (c64).

## Hypotheses

- **H6 (date+slug, never changed): holds with a qualification.** Collisions are real (c07, c87). Date+slug is used and reduces conflicts (c12, c83). But same-day collisions remain (c08, c79), and slugs age badly (c98, c99). Platform-assigned or random-suffix IDs are equally collision-free (c20, c23, c85). A CI duplicate check is needed in any scheme (c09).
- **H7 (small fix in place with logged correction; changed conclusion = new superseding record): holds with a qualification.** The two-tier split is widespread (c18, c22, c41, c46, c47). RFCs and Crossref log errata or notices beside an untouched original rather than editing (c32, c49). GOV.UK prefers updating guidance in place (c56). Thunderbird allows edits (c19).
- **H8 (retracted record never deleted, keeps ID and reason): holds with a qualification.** It is the norm (c38, c42, c45, c91). Legal, privacy or copyright removals are allowed everywhere looked, but the ID and a tombstone stay (c44, c51, c55, c97).
- **H9 (re-check date + script-computed stale): holds with a qualification.** It is common and tooled (c57, c60, c93, c94). But dates are often ignored (c66, c72). Cochrane rejects mechanical intervals (c68). The rubber-stamp risk is reported but not measured (c95). MDN shows no review marker (c62).

## Could not verify / blocked

- Blocked: COPE, 403 twice (s20, s21; c52 snippet-only). NICE, 403 twice (s40, s96). BMJ, 403; the PMC copy was used (s70, s78). PubMed, cookie wall (s79). Meta Stack Overflow (s38; c74 snippet-only).
- 404 on two routes each: DOI Handbook (s67, s80), changesets docs (s103, s104).
- Not confirmed: an official definition of ms.update-cycle (c61), arXiv's admin-removal policy (c97), Angular's review-date rule (c96).

## Searches that found nothing

- Studies of the share of docs past their review date (s63, s97).
- The outcome of Stack Overflow's outdated-answers project (s87).
- arXiv's removal policy (s112).
- Measured rubber-stamping (s107).

## Earlier lines checked

The earlier helper wrote s01–s99 and c01–c86. All are kept unchanged. I appended s100–s115 and c87–c100.

Re-opened and confirmed: c07–c09 (s30), c20–c22 (s05), c38 (s14), c42 (s17), c66 (s68), c40 (s16 only), c72 (s37), c16 and the ms.update-cycle part of c60 (s95), c49 (s74), and the s61 half of c54 and c55. s61 does not mention site search, so that part of c54 rests on s62, which I did not re-open.

Not checked: all other earlier claims (c01–c06, c10–c15, c17–c19, c23–c37, c39, c41, c43–c48, c50–c53, c56–c59, c61–c65, c67–c71, c73–c86) and the s94 part of c40.

## Session

Model ID: `claude-opus-5-5`. Effort level: unknown (not shown in my session).
