# Coverage

Options down the side, the questions from the brief across the top. Each cell names claim IDs from [claims.csv](claims.csv) that bear on it, for or against, or says `gap`. The dossier says which way each claim points.

- **A. Topic folders:** the folder a dossier sits in is its category (`dossiers/apps/testing/<slug>/`), and the README lists the folders.
- **B. ID-sharded store, card, fixed tags, generated index:** every dossier sits under its creation month (`dossiers/YYYY/MM/<id>/`), carries its tags in `dossier.json` from fixed lists, and an index built after merge groups it by every tag.
- **C. One shared catalogue:** one big list file (an awesome-list README or one YAML registry) that every pull request edits, with free-form tags.

| Option | Grouping and two-domain fit | Identity and renames | Change, superseding, retraction | Freshness | Scale (index, folders, CI) | Contributions and review cost | Prior art that does it |
|---|---|---|---|---|---|---|---|
| **A. Topic folders** | Against: cls-c39 (people like folders, one per item), com-c037 (nixpkgs left category folders because items fit several), cls-c35 | Against: idv-c75 (subject in an address breaks it), com-c004 (MDN needs 17,637 redirect lines) | `gap`: no source tested change handling in topic trees | `gap` | com-c024, lim-c25 (1,000-entry listing), lim-c19 | For: com-c001 (MDN), com-c035 (Turing Way) | MDN, The Turing Way, awesome lists |
| **B. ID-sharded store + card + fixed tags + generated index** | For: cls-c31, cls-c32, cls-c02, cls-c03, cls-c07, com-c014, com-c048. Against: cls-c06 (primaries often wrong), cls-c41 | For: idv-c12, idv-c75, idv-c18. Against: idv-c08, idv-c79 (same-day collisions), idv-c98 (slugs age) | For: idv-c29, idv-c22, idv-c38, idv-c42, idv-c44, idv-c45, idv-c49, idv-c51 | For: idv-c93, idv-c94, idv-c92, idv-c88, idv-c64. Against: idv-c66, idv-c72, idv-c68 | For: a-c01 to a-c07, com-c003, com-c016, com-c041, com-c039, lim-c27, lim-c28 | For: con-c01, con-c09, con-c11, con-c73, con-c77, con-c85. Against: con-c84 | nixpkgs by-name, PEPs, Rust RFCs, RustSec, awesome-selfhosted-data, winget-pkgs |
| **C. One shared catalogue** | Against: cls-c23, cls-c27 (free tags sprawl), cls-c30 (awesome rules ask for a hand-written file) | `gap` | `gap` | For: cls-c33 (best-of flags inactive items automatically) | Against: lim-c27, cls-c33 (512 KB README cut-off), cls-c31 (a 331,000-character README) | Against: con-c01, con-c03, con-c16 (shared file conflicts; merge=union not honoured) | Most awesome lists |

## By sub-question

| Question | Claims | Gaps |
|---|---|---|
| Fixed tags or folders, and which facets | cls-c02 to cls-c07, cls-c13, cls-c14, cls-c17, cls-c23 to cls-c39, com-c014, com-c037, com-c048, met-c13 | No numeric guideline on how many facets people handle (cls-s55). No study of Diátaxis on research notes (cls-s24) |
| Adding tags without sprawl | cls-c04, cls-c23, cls-c24, cls-c26, cls-c27, cls-c32, cls-c36 | Stack Overflow's current tag rules: pages refused the fetch |
| One dossier in two domains | cls-c02, cls-c03, cls-c06, cls-c07, cls-c34, cls-c35 | Share of arXiv papers that are cross-listed (cls-s82) |
| Stable IDs | idv-c07 to idv-c12, idv-c20, idv-c23, idv-c75, idv-c79, idv-c85, idv-c87, idv-c98, com-c019, com-c048 | none |
| Versions, superseding, corrections, retractions | idv-c18, idv-c22, idv-c29, idv-c32, idv-c38, idv-c41 to idv-c51, idv-c55, met-c26, met-c30, com-c049, com-c052 | arXiv's removal policy (idv-s112). COPE's page refused the fetch |
| Re-check dates and staleness | idv-c64, idv-c66, idv-c68, idv-c72, idv-c88, idv-c92 to idv-c94, cls-c33 | Measured rubber-stamping of review dates (idv-s107) |
| Scale | a-c01 to a-c07, lim-c19 to lim-c30, com-c003, com-c009, com-c016, com-c022, com-c024, com-c027, com-c039, com-c041, com-c044, com-c054, com-c058 | Timing on real dossiers (only synthetic ones were measured) |
| Contributions, CI and review | con-c01 to con-c86, a-c08 to a-c10, a-c15 | Whether GitHub's merge button honours merge=union. Copilot review on forks |
| Big data and the LFS quota | lim-c01 to lim-c13, lim-c34 to lim-c36, lim-c56 to lim-c79, lim-c83 to lim-c96, met-c02 to met-c10, met-c42, a-c12 | The owner's actual plan (a-c12). GitHub Pro's current price (lim-c84) |
| Licences | lic-c01 to lic-c71 | Licence shares on arXiv, Zenodo and Hugging Face. Stack Overflow's licence page refused the fetch |
| Metadata format | met-c02 to met-c54 | Whether GitHub still renders YAML front matter as a table (met-c43) |
