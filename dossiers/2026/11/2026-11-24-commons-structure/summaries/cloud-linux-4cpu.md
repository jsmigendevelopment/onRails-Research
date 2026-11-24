# Summary: cloud-linux-4cpu

One machine: the cloud container this research ran in (Linux, 4 vCPUs, about 16 GB of memory). Node v22.23.5, git 2.43.0. One warm-up and three measured runs per case. Every number below is **measured**, from [runs/2026-11-24-scale-3](../runs/2026-11-24-scale-3/results.csv), except where a line says run 2.

Synthetic dossiers are about 5 KB each (one source, one claim, one finding). Real ones are larger, so treat the sizes as a floor.

| | 10 dossiers | 1,000 | 10,000 |
|---|---|---|---|
| Pull request check, one new dossier (median ms) | 89 | 136 | 606 |
| Check everything (median ms) | 84 | 802 | 7,085 |
| Build the index (median ms) | 84 | 153 | 695 |
| index.json (bytes) | 8,637 | 783,628 | 7,848,353 |
| Largest index page (bytes) | 5,162 | 17,888 | 178,612 |
| Most entries in one store folder (dates over 11 years) | 9 | 12 | 79 |
| Store on disk (bytes) | 56,384 | 5,137,449 | 51,338,488 |

Spread: in each timing cell the three measured runs varied by 6% to 30% of their median. 7 of 9 cells stayed within 25%, and 2 within 15%. The widest was the index build at 10,000 dossiers.

## The two earlier runs

- [Run 1](../runs/2026-11-24-scale/results.csv): every check row failed. The synthetic dates ran past the run day, and the checker rightly refused them. Its index and size rows are kept as they came.
- [Run 2](../runs/2026-11-24-scale-2/results.csv): every pull request check row failed, because the harness left `scripts/` uncommitted and the checker rightly refused a pull request that changes scripts next to a dossier. It also showed `stale.md` at 1,807,321 bytes with 10,000 dossiers, nearly all stale. The index builder was then changed to split the stale and changes pages by year, which run 3 measures.

Run 1 spread its dates over about 5 years, and its largest store folder held 170 entries at 10,000 dossiers: folder size depends on how many dossiers start in one month.

Each run folder is kept unchanged. The manifests say why each later run exists.
