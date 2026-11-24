# Notes: licences for text, code and data (lic)

## Findings that matter most

1. Licensing text and code separately is normal. GitHub Docs: CC BY 4.0 content, MIT code. The Turing Way: the same. MDN: CC BY-SA prose, CC0 code samples. Wikidata: CC0 data, CC BY-SA text (c09, c13, c08, c06).
2. Share-alike is common among documentation and knowledge projects: Wikipedia, MDN prose, Diátaxis, Stack Overflow, GNOME docs, OpenStreetMap, Papers with Code data (c05, c08, c12, c14, c22, c19, c17).
3. Funders push CC BY for papers. Plan S defaults to it and BOAI10 calls it optimal. CC reports only about 18% of preprints were CC BY in mid-2024, with no method shown (c68, c35).
4. Data platforms default to CC BY or CC0. Zenodo defaults to CC BY 4.0, Wikidata uses CC0, and CC's 2026 data guidance calls CC BY a "gold standard" and asks that attribution be requested on CC0 data (c18, c06, c34, c33).
5. Creative Commons advises against CC licences for software, with CC0 as the exception (c28).
6. Upstream licences per source: OWID records origin.license.name and origin.license.url and takes the strictest. Hugging Face has one `license` field plus `source_datasets`, with no licence for each upstream source. OWID's CC BY excludes third-party data (c04, c01, c15, c16).
7. Dataset licence metadata is unreliable: an audit of more than 1,800 datasets found licences omitted in more than 70% of cases and wrong in more than 50% (abstract only) (c71).
8. GitHub detection: when root licence files disagree, Licensee returns no single licence. The interface has listed all root licences since 2022, and a REUSE-style `LICENSES/` folder is scanned. REUSE 3.3 is current (c47, c48, c49, c50).
9. GitHub ToS D.6 makes inbound equal outbound by default. Guides say most projects need no CLA. The DCO is the light option, and CLAs add friction (c51 to c55).
10. In the US, purely AI-generated material is not protected. Human selection, arrangement or creative modification can be. Prompts alone are not enough. Thaler's petition was denied on 2026-03-02. EU member states agree that only a natural person is an author (c56 to c60).
11. The UK still gives computer-generated works an author under s9(3). A report of 2026-03-18 proposes removing this; it is not yet law (c61).
12. Creative Commons: you can license a work made with AI tools, but only the human contribution is covered. CC encourages CC0 where human creativity is low (c62, c63, c64).
13. Facts are free in the US under Feist. The EU adds a 15-year database right, which CC BY 4.0 and ODbL license (c42, c43, c29).
14. Code: MIT keeps the notice but has no patent grant. Apache-2.0 adds a patent licence plus NOTICE and change-marking duties. 0BSD asks for nothing (c44, c45, c46).

My inference, not a sourced claim: on dossiers drafted by AI and reviewed by a person, CC BY covers only the human parts (edits, selection, arrangement). CC0 removes that ambiguity but drops the legal attribution duty (c34, c57, c62).

## H18

- CC BY for text: **holds, with a qualification.** It is common, but big projects also use CC BY-SA or CC0 (c09, c13, c01, c18, c68; against: c05, c08, c11, c12).
- MIT or Apache-2.0 for code: **holds** (c09, c13, c03, c10). Exceptions: MDN samples are CC0, and OWID's Grapher code is now closed (c08, c02).
- CC0 or CC BY for data: **holds, with a qualification.** OpenStreetMap (ODbL) and Papers with Code (CC BY-SA) are share-alike (c06, c18, c34; against: c19, c17).
- "Share-alike is rare outside Wikipedia": **refuted** for documentation and knowledge projects (c08, c12, c14, c17, c19, c22). It is rarer for papers (c69, opinion only).
- Can AI-assisted text carry a licence? **Holds, with a qualification.** Only the human-authored parts can be licensed in the US and EU. The UK differs for now (c57, c58, c60, c61, c62).

## Trade-offs

- Against share-alike: less interoperable, avoided by publishers, poor fit for databases (c65, c66, c70). For it: keeps added value in the commons and still allows commercial use (c70, c66). Opinion only; no measured evidence either way.
- NonCommercial is excluded or warned against (c67, c41, c65). CC0 drops attribution (c34). Attribution stacking: c65.

## Earlier lines checked

Re-opened and checked: s01, s02, s04 to s07, s09 to s18, s20, s21, s25 (search re-run), s26 to s47, s49 to s56, s58 to s61, s63 to s76, s78 to s82, s84, s87 to s96. Not re-checked, and cited by no claim: s03, s08, s19, s22, s23, s24, s48, s57, s62, s77, s83, s85, s86, s97, s98, and the searches s99 to s114 other than s25. The earlier helper wrote no claims. All 71 claims are mine. I added sources s115 to s120.

## Could not verify

- Stack Overflow's licence page was blocked (s23, s24), so c14 is summary-only.
- Licence shares on arXiv, Zenodo and Hugging Face: no primary figure.
- Which licence ToS D.6 applies when a repository has several licence files.
- A final Part 3 or 2026 Copyright Office guidance: none shown.
- Blocked: the European Commission database page (503, s120), pantonprinciples.org (s119), EUR-Lex (s85).

## Searches that found nothing

s107, s108 (CLA or DCO use), s109 (Zenodo shares), s112, s113 (share-alike evidence). Logged earlier; not re-run.

## Model

Model ID: `claude-opus-5-5`. Effort: `unknown` (no named level shown; the context shows a reasoning-effort value of 15).
