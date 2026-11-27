---
name: dependencies
description: Use when adding, choosing, upgrading or replacing a library, package or self-hosted tool ("add a library for this", "which package should we use", "is this licence ok", "upgrade dependencies") - prefer a popular maintained library over hand-rolled code, check licence, size and maintenance, pin exact versions, swap only for a concrete gain, and keep copyleft and source-available licences out of a product that may go closed-source.
---

# Dependencies: reuse a good library, check it, pin it

Use well-kept libraries for solved problems, and check each one before it lands so it never surprises you on licence, size or upkeep.

## Rules

1. **Use a popular, maintained library for solved commodity problems.** Forms, dates, validation, data fetching, accessible UI parts and charts are solved. Write your own only for what is specific to the product: who may do what, and what happens after a failure.
2. **Verify the package is real before you install it.** Never install a name you guessed or one an AI suggested without checking. On the registry (`npm view <pkg>`, or the registry's page), confirm:
   - it exists, and it's the one you meant. Watch for look-alike names (`lodahs` for `lodash`) and odd scopes;
   - it has real weekly downloads, named maintainers and a source repo that links back to it;
   - it isn't brand new. A first release in the last few weeks needs a reason.

   Write the registry link in the PR. Attackers register the names AI models invent.
3. **Look in the repo first.** Search for something the app already uses before adding anything. Never add a second library that does the same job; theme or wrap the one you have.
4. **Wrap a library behind a thin app-owned adapter** when the app needs its own look or API. The rest of the code imports the adapter, so a later swap touches one file.
5. **Run the adoption check before adding.** Confirm the current stable release supports your runtime and framework (read `peerDependencies` and `engines`). Check the bundle or install size in your own build, the transitive dependencies, the last release date, open security advisories, and whether issues get answered.
6. **Check the licence of the exact version you ship.** Read the SPDX id from the registry (`npm view <pkg>@<version> license`) or the project's LICENSE file, not a README or a search summary. Write the id and the date in the PR. Licences change between versions.
7. **Safe for a product that may be closed-source or sold as a service:** MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense, CC0-1.0, BSL-1.0 (the Boost licence), BlueOak-1.0.0, Python-2.0 and CC-BY-4.0 (the last three come with most JavaScript build toolchains). MPL-2.0 is fine to use, but changes you make to its files must be published.
8. **Not allowed in shipped code:** AGPL, SSPL, BUSL-1.1 (Business Source), FSL, Elastic, any PolyForm licence, Commons Clause and other "source-available" licences with use limits. GPL is for reading ideas only; never bundle or link it. LGPL only if linked dynamically and unmodified. If nothing allowed fits, build it yourself.
9. **Read the SPDX id, not the acronym.** BSL-1.0 is permissive Boost; BUSL-1.1 is restricted Business Source. Server parts are often licensed differently from client SDKs, so check the part you actually run.
10. **Enforce the licence allow-list before every merge** (`pnpm check:merge` on the web pack, which the local gate, `coordinate` step 6.1, runs). Fail the build on any licence not on the list (for npm, `license-checker-rseidelsohn --onlyAllow "..."`; for pnpm, `pnpm licenses list --json` into a small script). Each exception names the package, a reason and a date.
11. **Pin exact versions in an app.** No `^` or `~` in the manifest (`pnpm add -E`, `npm install -E`), a committed lockfile, and frozen-lockfile installs (`npm ci`, `pnpm install --frozen-lockfile`) in the local gate and the deploys. Upgrades arrive as their own reviewed pull requests.
    - **Young packages (0.x)** can break on any minor release: pin exactly, read the changelog for every bump, and never let Dependabot auto-merge them. TanStack Hotkeys (`@tanstack/react-hotkeys`, 0.27.2 on 2026-11-23) is one: mark it young in the PR and in `docs/stack.md`.
    - **Dependabot keeps running with GitHub Actions off.** GitHub runs it on its own runners, past a repo's or an organisation's Actions setting, and it uses no Actions minutes on standard runners (GitHub's "About Dependabot on GitHub Actions runners", checked 2026-11-26). Its bumps arrive as pull requests from `dependabot[bot]`. How a bump reaches main, by automation level (`docs/stack.md`):
      - **Recommended and Full:** the loop takes it. In `coordinate` step 6.1, `own-branch.mjs` passes a bump on a `dependabot/` branch in this repo, made only of Dependabot's own verified commits, that changes only dependency versions in existing `package.json` files and lockfiles that stay on the npm registry, with no claim. The loop labels it `no-issue` and runs it like any pull request: the local gate in a clean clone, review with this skill's checklist (and the changelog for a young package), `qa` on the preview, then the merge. It's the normal lane, so agents merge it. A bump that fails gets an issue with `dependencies` on its `Skills:` line, built on the loop's own branch; Dependabot closes its pull request once main has that version.
      - **Custom:** the same, with the loop on; the normal lane's merge switch says who merges.
      - **Hands-on, or the loop off:** nothing runs it. The person reviews and merges each bump.
      - **On every level,** a bump that changes any other file, or comes from a fork, is refused (exit 1), and so is one that changes anything else in a `package.json` (scripts, overrides, `packageManager`, a URL, git or tarball version, anything but a semver range), adds or removes a manifest, points its lockfile off the registry, or carries a commit that isn't Dependabot's: its code never runs, and it is labelled `needs-human`, like any pull request that isn't the loop's own.
    - **The kit's default libraries** (TanStack Form, Table v9, Charts, Markdown, Highlight, Virtual, Hotkeys) each have a recipe in `stack-tanstack-start/references/tanstack/` with the version last checked. Check the registry again before installing; use the recipe's version only if it is still the latest stable.
12. **Prove it in the real feature.** Land a new library in the feature that needed it, with that feature's tests, not in a demo page.
13. **Swap or refactor only for a concrete gain.** Name the gain in the issue (smaller bundle, a fixed bug, better accessibility, fewer lines to maintain) and show it in the PR. Never do a blind "upgrade everything to latest" or a broad rewrite that stalls current work.
14. **Ideas are free; code is not.** Learning from any project is fine. Copying code is allowed only from permissive licences, with the notice kept and the source, commit and SPDX id recorded in `THIRD_PARTY_NOTICES.md`.
15. **Popular is not the same as safe.** Download counts help you find a library; they are not a review. The licence and advisory checks still apply.

## Checklist before merge

- [ ] Each new package was checked on the registry: real, spelled right, with real downloads, maintainers and age.
- [ ] No new library duplicates one the app already has.
- [ ] The PR names each new dependency's version, SPDX licence id with the date checked, and size added.
- [ ] Every new licence is on the allow-list, and the licence check (`pnpm check:merge` on the web pack) passes.
- [ ] The manifest shows exact versions, and the lockfile is committed.
- [ ] The audit step shows no new high or critical advisory.
- [ ] A swap or upgrade PR shows the before and after for its named gain.
