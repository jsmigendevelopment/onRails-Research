# Code style

The owner's opinionated preferences. Lint enforces what it can. This covers the rest.

These rules hold whatever the stack. The `build` skill follows them, the `pr-review` skill checks them, and a stack pack turns as many as it can into lint rules. Tests have their own page: [testing.md](testing.md). How an app is put together (state, errors, loading, UI layers, the API, issue links) is in [app-conventions.md](app-conventions.md).

## The rules

### 1. Search before you write

Before you add a helper, component or util, search the repo for one that already does the job, and reuse it. Two helpers that do the same thing are a review finding.

**Why:** an AI writes a fresh helper faster than it finds the old one. Left alone, a repo grows three date formatters and two buttons, and each fix lands in only one of them.

### 2. The simplest thing that passes the checks

No new abstraction, layer, factory or generic until a second real use exists. One use gets plain code.

**Why:** an abstraction built for one case guesses at the second, and usually guesses wrong. It is cheaper to extract one when the second case shows up and you can see what the two share.

### 3. No leftover junk

None of these in a pull request:
- unused files, exports or dependencies;
- `console.*` of any kind (use the one logger, `lib/logger.ts`);
- commented-out code;
- a TODO without an issue number (`TODO(#42): ...`).

**Why:** junk costs every reader a moment of "is this used?" Git keeps the old code, and an issue keeps the TODO from being forgotten.

### 4. No type escape hatches

No `any`, `@ts-ignore`, `@ts-expect-error`, `as unknown as` or `eslint-disable`. When one is truly unavoidable, it gets a comment on the same line or the line above with the reason and an issue number, and the reviewer flags it.

**Why:** each one turns off the checker exactly where the code is hardest to get right. The comment and the issue make it a decision someone can revisit, not a quiet hole.

### 5. Small files and functions

Warn at 300 lines a file. 500 is the hard cap. Keep functions under about 60 lines. Split by responsibility, not by line count: a file cut in half at line 250 is worse than one long file.

**Why:** small files with one job are easier for people and agents to read and to change safely. A file an agent can't hold in view is a file it edits blind.

### 6. On-design UI only

Use the design tokens and the UI kit's components. No one-off colours, spacing or font sizes, such as `#3b82f6`, `mt-[13px]` or `font-size: 15px`. A new token is a design decision: below Full, ask the person. On Full, add it, record it as "AI pick, not reviewed" and put it in the FYI; the review checks it.

**Why:** one-off values are how a UI drifts. Tokens keep every screen in step, and a theme change happens in one place.

### 7. Verified packages only

Before you install, confirm on the registry that:
- the package exists;
- it is the one you meant (watch for look-alike names, like `reqeusts` for `requests`);
- it has real downloads, real maintainers and some age.

Never install a name you guessed. The `dependencies` skill has the full check.

**Why:** AI models invent package names, and attackers register those names with malware in them. A wrong name runs someone else's code on your machine and on every machine that installs the app.

### 8. Tests that test something

Tests first for every acceptance check. Strict red/green for bugs and core logic. Test behaviour through the public interface, mock only at the edges, no snapshot tests for logic, and each test must fail without the change. Details and the reasons: [testing.md](testing.md).

**Why:** a test that can't fail proves nothing, and a test tied to internals breaks on every refactor.

### 9. Docs move with the code

A change that makes a doc wrong updates that doc in the same pull request: `docs/design.md`, `docs/architecture.md`, a README, a module's one-line doc. The reviewer checks.

**Why:** the next agent reads the docs before the code. A wrong doc sends it the wrong way with full confidence.

### 10. Copy the nearest existing example

Find the closest thing the repo already has, a module, a route or a test, and match its naming, error handling, file layout and test style. If a generator exists (`pnpm new:module` or similar), use it. Never free-write a module that a generator makes.

**Why:** one way of doing each thing keeps the repo readable. The generator already holds the right shape, and a free-written copy drifts from it on day one.

### 11. No swallowed errors

No empty `catch`. No catch that throws the error away or logs it and carries on as if nothing happened. Handle it, or wrap it in the project's one error shape and pass it on. Never re-throw it as a generic error that loses its code. The full error system is rule 5 in [app-conventions.md](app-conventions.md).

**Why:** a swallowed error turns a loud bug into a silent wrong answer, found weeks later by a user.

### 12. Comments say why, not what

No comments that narrate the code (`// loop over the users`). Write comments for the reason a reader can't see: a workaround, a business rule, a trap. Each exported module API gets a one-line doc comment.

**Why:** the code already says what it does. Narration goes stale and gets in the way. The one-line doc is what shows up when someone hovers over the name.

### 13. Small pull requests

Aim for under about 400 changed lines, not counting lockfiles and generated files. Split a bigger one, or label it `large-pr` with the reason in the description.

**Why:** reviewers, human or AI, catch less as a diff grows. A small pull request gets a real review.

### 14. Naming and imports

- Files are kebab-case: `user-profile.tsx`, not `UserProfile.tsx`.
- Use the project's path alias (`@/lib/errors`) instead of a deep `../../../lib/errors`.
- Order imports the same way everywhere: outside packages, then the alias, then relative paths. Let the linter sort them.
- No barrel files. Import from the file itself, never from a folder's `index.ts`. Only a published library gets one. See rule 4 in [app-conventions.md](app-conventions.md).

**Why:** one naming and import style makes files easy to find and diffs easy to read. Case-only file renames also break on some systems. A barrel hides where code lives and drags the whole folder into the bundle.

### 15. Money, time and access go through their one module

- Money goes through `lib/money.ts`. No `number` arithmetic on decimals, no `parseFloat` on a price.
- Time goes through `lib/time.ts` and the injected `now`. No `Date.now()` or `new Date()` in a service, no `Date.parse` on user text.
- Logs go through `lib/logger.ts`, events through `track()`, env values through `lib/env.ts`, and access decisions through `check()`.

The rules behind each are 10 to 18 in [app-conventions.md](app-conventions.md).

**Why:** each of these has a trap that one module handles once: floats losing cents, time zones, leaked tokens, typo'd event names, a missing role check. Code that goes around the module brings the trap back.

## What lint should catch

A stack pack turns these into lint rules, so the reviewer only judges what a tool can't:

| Rule | A tool can check |
|---|---|
| 3 | unused exports, files and dependencies (for example `knip`), `no-console` outside the logger, TODOs without `#<number>` |
| 4 | `no-explicit-any`, `ban-ts-comment`, `eslint-disable` without a description, `as unknown as` |
| 5 | `max-lines` (warn 300, error 500), `max-lines-per-function` (about 60) |
| 6 | arbitrary Tailwind values and raw colour literals outside the token files |
| 11 | `no-empty` for catch blocks, a catch whose error is never used |
| 14 | kebab-case filenames, no deep relative imports, import order, no `index.ts` re-export files |
| 15 | `no-restricted-syntax` for `parseFloat`, `Date.now()`, `new Date()` and `Date.parse` in services; `process.env` outside `lib/env.ts` |

Rules 1, 2, 7, 8, 9, 10, 12 and 13 need judgement. `pr-review` checks them by hand.

## Your own preferences

Add your own rules here, in the same shape: the rule, then one line of why. Then ask an agent to carry them into the `build` and `pr-review` skills and, where a tool can check one, into lint.

Prompts to start with:

1. *"Grill me on my code style. Three questions at a time, each with your recommended answer. Then add what I decide to the 'Your own preferences' section of `guide/code-style.md`."*
2. *"Read the last 20 merged pull requests and list the review comments I keep making. Turn each repeat into a rule with a short why, and add them here."*
3. *"Look at `src/modules/<the module I like best>` and write down the patterns it follows that aren't in this guide yet. Show me the list before you add anything."*

<!-- Add your rules below this line. -->
