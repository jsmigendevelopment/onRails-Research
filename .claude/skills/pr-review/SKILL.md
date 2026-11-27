---
name: pr-review
description: Use to review a pull request or branch as an independent reviewer ("review this PR", "review the change on branch X", "is this ready to merge", or a brief that says use pr-review) - reads only the diff, the issue and the check results, never the author's description; checks every acceptance check ID has a real test, no test was weakened, the fence and architecture were kept, and the code is readable; posts one verdict that names the commit.
---

# PR review: fresh eyes on the diff

You did not write this code. Judge only the **issue, the diff and the check results.**
- Run from main, and read the change with `gh pr diff <n>` (or `git diff main...<branch>`).
- **Don't read the pull request description or the commit messages.** Persuasive descriptions make reviewers miss real problems.

## Check

1. **Every `auto` acceptance check has a test whose title carries its ID.** Search the diff for each `AC-<issue>-<n>`. A missing ID, or a test that doesn't prove its check, is a must fix. Each test would fail without the change. The local checks passed on the head commit (`coordinate`, step 6.1). Briefed to run them yourself? Follow that step from its first check: the local gate only runs the loop's own branches. Workflow results don't count.
   - A bug fix comes with a test that reproduces the bug.
   - Tests go through the public interface and mock only the edges (network, clock, randomness).
   - No snapshot test stands in for a logic test.
2. **No test was weakened,** skipped or deleted, including tests from earlier slices.
3. **The fence:** nothing out of scope was built, and the schema and API changed only if the issue said so.
4. **Architecture:**
   - feature modules don't import each other's internals;
   - no business logic in a controller, and no SQL in a service;
   - no hand-rolled components the UI kit already has;
   - no one-off colours, spacing or font sizes, and no new design token the person didn't approve (on Full, a new token recorded as "AI pick, not reviewed" passes, as `build` step 7 says);
   - the screens match `docs/design.md`.
5. **Code rules.** Check each one. Lint catches some, not all:
   - [ ] **Reuse:** no new helper, component or util that duplicates one the repo already has. Search for it.
   - [ ] **Simple:** no new abstraction, layer, factory or generic with only one real use.
   - [ ] **Nearest example:** naming, error handling, layout and test style match the closest existing code. A new module came from the generator, if there is one.
   - [ ] **No leftovers:** unused files, exports or dependencies, any `console.*`, commented-out code, a TODO without an issue number.
   - [ ] **No escape hatches:** `any`, `@ts-ignore`, `@ts-expect-error`, `as unknown as`, `eslint-disable`. One with a reason and an issue number may stay, but list it as a finding.
   - [ ] **Size:** no file over 500 lines (say so past 300), no function over about 60, split by responsibility.
   - [ ] **Errors:** no empty catch, no caught error thrown away, the project's one error shape.
   - [ ] **Comments** say why, not what. Each exported module API has a one-line doc.
   - [ ] **Names and imports:** clear names, kebab-case files, the path alias, no deep `../../..`.
   - [ ] **New packages** are real, spelled right, and checked as the `dependencies` skill says.
   - [ ] **Docs:** any doc the change makes wrong was updated in this diff.
   - [ ] **Size of the change:** under about 400 changed lines, not counting lockfiles and generated files, or labelled `large-pr`.
6. **App conventions** (`guide/app-conventions.md` in the kit). One line each:
   - [ ] **Issue link:** the branch is `feat/<n>-...` or `fix/<n>-...`, and the body says `Closes #<n>`, unless it's labelled `no-issue`. Reading the body for this one line is fine.
   - [ ] **Rule of three:** no third copy of a UI piece that should now be shared, and no shared component extracted before then.
   - [ ] **State:** local state by default, shareable or refresh-safe state in typed search params, Zustand only for complex shared client state, no server data in a store, forms in TanStack Form, tables in TanStack Table, no props through more than two levels.
   - [ ] **No barrels:** no new `index.ts` re-export file outside a published library.
   - [ ] **Errors:** `AppError` with a listed code, a specific message for each expected error, a reference ID for the rest, nothing swallowed or re-thrown as generic.
   - [ ] **Loading:** data prefetched in the route loader, no query waterfall, empty, loading and error states for every dynamic area.
   - [ ] **Error, empty and skeleton:** the error state has an icon, a title, the code's message, a next action and the reference ID; the empty state has an icon or illustration, a sentence and the primary action; the skeleton matches the real layout with no shift; all on the design tokens. A bare "Error", a raw `error.message` or a plain grey box is a must fix.
   - [ ] **UI layers:** the route prefetches, the view doesn't fetch, each section wraps `Suspense` around an error boundary, components are presentational.
   - [ ] **API versions:** public routes under `/api/v1`; a breaking change adds a new version instead of changing the old one, with `Deprecation` and `Sunset` headers on the old.
   - [ ] **OpenAPI:** every new or changed public route or webhook is in the generated document, from the same Zod schemas. No internal server function in it.
   - [ ] **Money:** the `Money` type in integer minor units with its currency, no float or decimal `number` math, the stated rounding, remainders allocated, `Intl.NumberFormat` at the edge, tests for rounding and splitting.
   - [ ] **Time:** instants in UTC, dates and zoned times kept apart, the injected `now`, no ambiguous parsing, `Intl.DateTimeFormat` at the edge, daylight saving tests where it matters.
   - [ ] **Database:** snake_case plural tables, a server-made time-sortable `id`, `created_at` and `updated_at`, `<table_singular>_id` foreign keys with an index, check-constrained enums, `is_`/`has_` booleans, soft delete only where decided, a forward-only migration that's safe to roll out, important actions audit-logged.
   - [ ] **Logging:** only through the logger, one JSON line with the standard fields, the right level, nothing secret or personal, nothing in a loop, an error logged once at the boundary.
   - [ ] **Events:** every new event is in the registry with typed props, an owner and a date; sent only through `track()`; no personal data; important facts on the server.
   - [ ] **Env:** a new variable is in `.env.example` (with its metadata line), the env schema and the docs, all in this diff. Nothing reads env outside the schema.
   - [ ] **Translations:** strings in the module's `copy.ts`, or its message keys if translation is on. No strings built by concatenation.
   - [ ] **Access:** owner filters in the repository, or `check(user, action, object)` through the port. No role checks scattered in code. Someone else's object returns "not found".
7. **Bugs:** edge cases, errors, empty states, off-by-one errors, races.
8. **Instruction files:** if the diff touches `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `.codex/` or `.github/`, say so. Below Full, that needs the person. On Full, the code review and the local guard decide it, with the weakening review standing in for the person (`automation`'s `references/full.md`).

## Verdict

Post **one comment** on the pull request. Don't use GitHub's approve button: the builder and you usually share one account, and GitHub won't let an author approve their own pull request.
- The first line is `Code review: approve @ <commit sha>` or `Code review: request changes @ <commit sha>`.
- The second line is `Needs the person: yes` or `no`, with the reason. Below Full, it's yes when the lane, the risk dial or the automation level in `docs/stack.md` says the person merges it (the more careful one wins), or when the diff touches the instruction files. On Full it's no, whatever the lane or the risk dial: the dial adds reviews there, never a person, and the weakening review stands in for the instruction files (#103). The one yes on Full is a diff that touches an always-stop item (real data, production), which waits for the person at every level (rule 16). It's never yes because you'd like a second opinion.
- **Briefed as the weakening review** (Full automation)? Follow "The weakening review" in `../automation/references/full.md`: one question, then the exact pass or fail comment. The comment is all: `coordinate` runs the guard from the session before the merge, so no label and no re-run.
- Then numbered findings: the file and line, what's wrong, the fix. Mark each one **must fix** or **nice to have.** Only must-fix findings block the merge.

A verdict covers that commit only. Then add a board event: `node .agents/skills/coordinate/scripts/board.mjs event review pr=<n> verdict="code review: approve @ <sha>"`. A critical security hole goes through the `ask` skill as a 🛑 blocker.
