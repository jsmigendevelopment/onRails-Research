# Big data

Dossiers hold text. Anything big lives outside this repository, and the dossier's `data.json` points at it.

## What `data.json` holds

One entry per file: where to download it (`path`, pinned to a release, version or commit), its size (`bytes`), its SHA-256 (`hash`, written `sha256:<hex>`), its format, its licence (an SPDX ID such as `CC0-1.0`), the date it was made, how it was made (`made_by`), and the upstream sources with their own licences. The field names follow the Frictionless Data Package resource, so the record converts cleanly. The schema is [schemas/data.schema.json](../schemas/data.schema.json).

To get a checksum and a size:

```bash
sha256sum my-file.csv
stat -c %s my-file.csv
```

## Where the files go

This is waiting on the maintainer's decision (see [decisions.md](decisions.md), row 10). The recommendation, with its evidence, is in section 5 of the [first dossier](../dossiers/2026/11/2026-11-24-commons-structure/README.md):

1. **A public data repository** next to this one, with each dataset version as a GitHub release and its files as release assets. GitHub states no total size or bandwidth limit for releases; each file must be under 2 GiB, and a release holds up to 1,000 files.
2. **Zenodo** for snapshots people should cite: a DOI per version, and one DOI for all versions.
3. **Git LFS** only for small, rarely downloaded files. On a personal account it gives 10 GiB of storage and 10 GiB of download a month, and every download by anyone counts against it.

Keep a mirror in `mirrors` when you can. A dossier must still make sense if a link dies: its summary and its claims are in the text.
