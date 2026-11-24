# Brief: author

The owner's request for this research, word for word. It is one part of a longer message. The other parts (setting up the repo, the README, and a private reading list) are left out here, because they are not research and some of them name private material.

The session was asked to run on `claude-fable-5-2` at high effort.

---

```text
## Part 1: research the structure (the main job)

Follow the research standard: hypotheses before searching, a source ledger, claim labels, at least three options compared against evidence, and a fact-check in a fresh session.

**Questions to answer:**
- **Grouping and categories:** fixed tag lists versus folders versus both. Which facets (domain, topic, kind, stack, freshness, trust)? How do new tags get added without sprawl? What happens when one dossier fits two domains?
- **Identity and change:**
  - stable IDs that survive renames;
  - versions of a dossier;
  - one dossier superseding another;
  - retractions and corrections;
  - re-check dates, and marking a dossier stale.
- **Scale:** what still works with 10 dossiers, 1,000 and 10,000? That covers the index, search, CI time and repo size.
- **Contributions:**
  - the template and a `new dossier` generator;
  - one dossier per pull request;
  - what CI checks;
  - how a Claude review fits;
  - `CODEOWNERS` for trusted reviewers later;
  - keeping it cheap for me to review.
- **Big data:** data stays out of the text repo. Each dossier keeps a link, a checksum and its provenance. The data itself goes to Git LFS in a separate data repo, with free fallbacks. Check the real current limits: a GitHub plan costs about $20 a month, so confirm which plan that is and whether its LFS quota covers repos on a personal account.
- **Licences:** for the text, the code (scripts) and the data. Give options and a recommendation, and I'll pick.
- **Prior art to study:**
  - Our World in Data;
  - Papers with Code and arXiv categories;
  - Wikipedia categories;
  - Diátaxis;
  - Frictionless Data packages;
  - Hugging Face dataset cards;
  - schema.org Dataset and DataCite metadata;
  - architecture decision records;
  - big "awesome" lists;
  - any good research commons you find.

Write the result as the commons' first dossier, in the format you design, with its `provenance.json` (model `claude-fable-5-2`, effort `high`, date, sources, the fact-check session).
```

---

## Constraints the session also had

From the owner's plan for the commons (onRails issue #89) and the same message:

- Anyone can contribute, by pull request. One dossier or one fix per pull request.
- Claude reviews every pull request at first, and the owner merges. Trusted reviewers may come later.
- One dossier is one folder: the findings, a provenance record and, when there is big data, links with checksums.
- Tags come from fixed lists. A new tag value needs its own small pull request.
- A generated index groups everything by tag and marks a dossier stale after its re-check date.
- No paid services, no sign-ups, no secrets.
- The checker is Node with no dependencies.

**What good looks like:** a structure a stranger can follow from the template alone, that the owner can review in a few minutes per pull request, and that still works unchanged at 10,000 dossiers.
