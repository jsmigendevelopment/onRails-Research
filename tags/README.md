# The tag lists

Every dossier is tagged from four fixed lists. Fixed lists keep the commons easy to browse: the same idea always gets the same word.

| List | File | A dossier has | It answers |
|---|---|---|---|
| Domain | [domain.json](domain.json) | 1 to 3, the first is the main one | Which part of life or work does this help with? |
| Topic | [topic.json](topic.json) | 1 to 3 | What is it about? |
| Kind | [kind.json](kind.json) | exactly 1 | What shape is it: a comparison, a how-to, a trap, a benchmark or a dataset? |
| Stack | [stack.json](stack.json) | 0 to 4 | Which tool or platform does the answer depend on? |

Freshness and trust are not tags you pick. The index works them out: **stale** from the re-check date, and **fact-checked** or **cross-checked** from the provenance record.

## When a dossier fits two domains

List both. The first one is its main home, and the dossier shows up under each one in the index. It still has one folder and one ID.

## Adding a value

A new value needs its own small pull request. It changes one file in this folder and nothing else. CI turns down a pull request that adds a tag and a dossier together.

Before you open it, check:

1. **No listed value fits.** Read the `means` line of the close ones. A near fit is a fit.
2. **It will be used again.** Name three dossiers, written or planned, that would carry it. A value for one dossier is a title, not a tag.
3. **It is a noun a stranger would search for.** Lower case, words joined by hyphens, no version numbers.
4. **It has a one-sentence `means` line** that lets someone decide if it fits without asking you.

Domains are different: they follow the onRails packs. A new domain is added here when onRails adds the pack.

## Renaming or retiring a value

Never delete a value, and never change its `id`. Dossiers already carry it.

- **To retire one:** add `"retired": "YYYY-MM-DD"`. Dossiers that use it still pass, with a warning.
- **To rename or merge one:** add the new value, then retire the old one with `"use_instead": "<new id>"`. The index lists the old value's dossiers under the new one.
