# Hypotheses

Written 2026-11-24, before the first search. One line each: what I expect, then what would prove it wrong. The dossier's "Hypotheses, checked" section says how each one held up.

At this point I had read the owner's plan and two existing research standards (onRails's `research` skill and its checker). I had searched nothing.

## Grouping

- **H1.** A flat store with tags in a metadata file and a generated index beats a folder tree as the main way to group. A folder tree gives each dossier one home, and re-filing breaks links. *Wrong if* the big long-lived commons (Our World in Data, arXiv, Wikipedia, large package repos) use a folder or category tree as their main grouping and it holds up, or report that tags failed them.
- **H2.** Fixed tag lists stop sprawl, and free tags sprawl. *Wrong if* sites with free tags stay tidy without curation, or sites with fixed lists report that people route around them.
- **H3.** One primary domain plus optional secondary domains (the arXiv "primary category plus cross-lists" idea) is enough when a dossier fits two domains. *Wrong if* arXiv or others report that cross-listing fails, or a better known pattern exists.
- **H4.** The owner's five kinds (comparison, how-to, trap, benchmark, dataset) are a different axis from Diátaxis's four, and Diátaxis does not map onto research dossiers. *Wrong if* Diátaxis says its four kinds cover research write-ups, or the five kinds overlap so much that people can't pick one.
- **H5.** The tags should live in a small JSON file per dossier, not in YAML front matter. Node has no built-in YAML reader, and the checker must have no dependencies. *Wrong if* front matter gives something on GitHub that a JSON file can't, or prior art shows side files drift away from the text.

## Identity and change

- **H6.** An ID made of the creation date plus a short slug, never changed afterwards, is better than a running number. Running numbers collide when two pull requests are open at once. *Wrong if* the projects that use running numbers (decision records, RFCs, PEPs) report no collision problem, or date-based IDs have a known failure.
- **H7.** Small fixes are edits in place with a logged correction. A changed conclusion is a new dossier that supersedes the old one, which stays. *Wrong if* research repositories mostly version in place (arXiv v1, v2) and readers cope better with that than with chains of superseded records.
- **H8.** A retracted dossier is never deleted. It keeps its ID and a notice that says why. *Wrong if* the publishing guidelines (COPE, DataCite, arXiv) say to remove retracted work.
- **H9.** A re-check date per dossier, with "stale" worked out by a script from today's date, is how others keep reference material fresh. *Wrong if* review-by dates are known to be ignored in practice, or a better mechanism exists.

## Scale

- **H10.** One generated index page stops working near 1,000 dossiers, because GitHub cuts off long pages and long folder listings. The index has to be split by tag, and the store has to be split into subfolders. *Wrong if* GitHub's real limits are far higher than 1,000 rows or entries.
- **H11.** An index file that every pull request regenerates will make every pair of open pull requests conflict. The index should be built after merge, away from contributors. *Wrong if* large contribution repos commit a shared generated file in each pull request without a conflict problem.
- **H12.** Checking only the changed dossier on a pull request keeps CI time flat as the commons grows, and the text of 10,000 dossiers stays inside GitHub's repository size guidance if each dossier has a size cap. *Wrong if* a full check of 10,000 dossiers is fast anyway, or the size guidance is lower than I think.

## Contributions

- **H13.** A pull request from a fork cannot read repository secrets, so the Claude review cannot run on a stranger's pull request with the plain `pull_request` trigger. The safe design gates it behind the owner's click and treats the contributed text as untrusted. *Wrong if* the Claude Code action reviews fork pull requests safely with no extra step.
- **H14.** Projects with many small contributions keep review cheap by rule: one item per pull request, a template, and machine checks that fail before a person reads anything. *Wrong if* the large ones rely on human review first.

## Big data

- **H15.** The owner's plan at about $20 a month is GitHub Enterprise Cloud. Its larger Git LFS allowance belongs to the enterprise's organisations, and does not cover repositories owned by a personal account. *Wrong if* GitHub's billing pages say a personal account's repositories draw on an enterprise allowance, or a different plan costs about $20.
- **H16.** For public research data, Hugging Face Datasets, Zenodo and GitHub release files are free homes that fit. *Wrong if* their current limits or terms rule out this use.
- **H17.** Frictionless Data's package format already describes "a link, a checksum, a size and a licence per file", so the data file should follow it instead of a home-made shape. *Wrong if* the spec cannot point at remote files, or needs tools to write.

## Licences

- **H18.** The common pattern for an open research commons is CC BY 4.0 for text, a permissive licence (MIT or Apache-2.0) for code, and CC0 or CC BY for data. Share-alike is rare outside Wikipedia. *Wrong if* most of the commons I study use share-alike, or text written with AI help cannot carry a licence at all.
