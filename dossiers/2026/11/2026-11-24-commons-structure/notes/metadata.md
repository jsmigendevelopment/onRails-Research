# Metadata standards: notes (prefix `met`)

## Earlier lines

The part folder was empty when I started, so there were no earlier lines to check or keep. Every line in `sources.jsonl` (met-s01 to s82) and `claims.jsonl` (met-c01 to c54) is mine.

## Findings that matter most

1. **Frictionless v2 already has per-file fields for a link, checksum, size and licence:** `path` (a URL or a relative POSIX path), `hash`, `bytes` and `licenses`, all optional. A resource needs only `name` plus `path` or `data`. (c02, c03, c06, c07)
2. **The Frictionless hash defaults to MD5.** SHA-256 must be written as `sha256:<hex>`, and any prefix passes the schema. MD5 was chosen in 2013 for S3 compatibility. MD5 is fine for catching errors but not where collisions matter. (c04, c05, c53, c52)
3. **A Frictionless package descriptor must be named `datapackage.json`.** A source object has no field for the date it was accessed. OWID, by contrast, makes `date_accessed` and `date_published` required on every origin. (c09, c10, c41)
4. **Hugging Face keeps card metadata in YAML front matter and checks `license`, `task_categories` and `language` against fixed lists; tags are free.** A bad licence was rejected at upload. A bad language showed an error on the page. Missing metadata only warns. (c13, c14, c15, c16, c17, c18)
5. **Large docs repositories validate YAML front matter in CI, but with npm packages.** GitHub Docs uses a schema in its test suite. MDN uses Ajv with yaml and gray-matter. Microsoft Learn fails the build on missing keys. (c44, c45, c46, c47)
6. **Node v26.13.1 has no built-in YAML reader, and JSON loads natively.** No proposal to add YAML to Node core was found. (c48)
7. **JSON front matter is a convention some tools support.** Hugo and gray-matter both accept it. It would keep metadata in the same file and still parse with `JSON.parse`. (c49)
8. **Two searches found no concrete report of side-car metadata drift.** The sidematter convention prefers a `.meta.json` file and also says metadata should live in one place. (c50, c51)
9. **Licence IDs: SPDX has every data licence the brief names, but Hugging Face uses its own lowercase IDs.** The Hub has family IDs `odbl` and `pddl` where SPDX has ODbL-1.0 and PDDL-1.0. Open Definition now maps its IDs to SPDX, and DataCite's examples use SPDX. (c54, c21, c08, c32)
10. **schema.org can describe a data file too.** DataDownload carries contentUrl, contentSize and `sha256`. Google requires only `name` and a description of 50 to 5000 characters. `supersededBy` is for vocabulary terms, not for a superseded write-up. `correction` is the fitting property. (c22, c24, c25, c26)
11. **DataCite 4.7 (2026-03-03) has relation types that fit a commons.** `Report` and `Dataset` cover the two kinds of item. IsDerivedFrom, Cites, IsSupplementedBy, IsNewVersionOf and IsObsoletedBy cover sources, data and versions. Six properties are mandatory. (c28, c29, c30, c31)
12. **OWID keeps metadata in git and the data in object storage.** It records YAML metadata and a `.dvc` pointer (md5, size, path) in git. The files themselves sit in R2 buckets. (c42)
13. **Other light standards:** CITATION.cff adds a "Cite this repository" link (c33). RO-Crate uses one JSON-LD file (c34). FAIR R1.1 and R1.2 ask for a licence and provenance (c37). PROV is heavy RDF with little measured uptake (c39, c40).

## Hypotheses

**H5 (tags in a small JSON file, because Node can't read YAML): holds, with a qualification.**
- Premise confirmed: Node has no YAML reader (c48), and MDN needs npm packages to validate YAML (c45).
- But a separate JSON file is not the only dependency-free option: JSON front matter keeps one file per dossier (c49).
- Big platforms mostly use YAML front matter (c13, c44, c46, c47), which GitHub has rendered as a table since 2013 (c43).
- No measured side-file drift was found (c51).

**H17 (follow Frictionless for data files): holds, with a qualification.**
- The fields exist and are light (c02, c03, c06, c07), the spec is maintained (c01), and adopters are listed (c11, c12).
- But a bare hash means MD5, so dossiers must write `sha256:` (c04, c05, c53).
- A package file must be named `datapackage.json` (c09).
- Sources have no accessed date, which OWID requires (c10, c41).
- Licence names are Open Definition IDs, now mapped to SPDX (c07, c08).
- schema.org's DataDownload is a credible alternative (c24).

## Could not verify

- Whether GitHub still renders front matter as a table today. The only source is a 2013 blog post updated in 2019 (c43).
- The exact year of the CodeMeta 4.0 release (c35).
- Release dates for RO-Crate 1.2 and 1.3 (c34).
- CFF's required keys and current version (pages showed only a 1.2.0 example).
- Whether the Hub rejects a git push, not just an API upload, on invalid metadata (c16).
- How OWID uses Data Package (c11).
- The full `size_categories` list; the fetched text was garbled (c19).

**Blocked:**
- go-fair.org returned HTTP 503 (s37).
- nature.com redirected to a login page (s38).
- I used the PubMed Central copy of the FAIR paper instead (s39).

## Searches that found nothing

- A current Frictionless proposal to change the MD5 default (s06).
- A Node.js core YAML module or proposal (s57, s58).
- Concrete reports of side-car metadata drift (s66, s68).
- A study of PROV use by project size (s78).
- A list of projects that have moved to Data Package v2 (s75).

## Session

- Model ID: `claude-opus-5-5`
- Effort level: `unknown` (my session does not show it)
