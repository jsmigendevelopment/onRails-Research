# Notes: contribution workflow, CI, review and security (con)

## Findings that matter most

1. Shared files that every contribution edits cause conflicts, and big projects removed them: nixpkgs all-packages.nix, GitLab's CHANGELOG, and the reasons towncrier and reno exist (con-c01, c03, c04, c06, c07).
2. The working pattern is one file per item, with shared output built after merge, away from contributors: awesome-selfhosted-data, tldr, cdnjs, DefinitelyTyped (CODEOWNERS synced weekly, formatting fixed after merge) and Homebrew bottle blocks (c09, c11–c15).
3. GitHub has no official statement on `merge=union` in pull request merges. A request has been unanswered since 2021, and Git warns the union driver scrambles line order (c16–c19).
4. Fork pull requests on `pull_request` get no secrets and a read-only token. `pull_request_target` and `workflow_run` get secrets, and `pull_request_target` skips the approval gate. GitHub will block `pull_request_target` by default in public repos from 2026-12-02 (c24–c26, c29, c31).
5. `secrets` can't be used in `if:`. The documented way is a job-level env var, and an unset secret evaluates to an empty string (c27).
6. claude-code-action@v1 skips fork pull requests by default and the step still succeeds, so a required check can pass with no review. Its docs say the review example only works for same-repo branches (c34, c38, c43).
7. Auto mode is now the default, so `--allowedTools` is not a strict allowlist unless `--permission-mode` is set. `allowed_tools` is deprecated (c41, c42).
8. Prompt injection through pull request and issue text into AI CI agents is documented in PromptPwnd, Comment and Control, Microsoft's key leak via /proc (fixed in 2.1.128) and GitInject (c49–c52). Anthropic's security-review action says it is not hardened against it (c48).
9. A personal-account public repo on Free gets rulesets, branch protection and CODEOWNERS. But branch-protection bypass lists are org-only, authors can't approve their own pull requests, and push rulesets are for private repos only (c57–c63).
10. No doc says the Actions token can push past protection. It is a backlog request since 2022, and users put a GitHub App in a ruleset bypass list instead (c65, c61).
11. Secret scanning is free and automatic on public repos, including issue and pull request text. User push protection is on by default (c67, c68).
12. Link checkers can't beat bot blocks. The advice is caching, low concurrency, exclusions and a scheduled run that opens an issue (c69–c72).
13. Repos with many small contributions keep review cheap with rules plus bots: winget (one package version per pull request), DT owner auto-merge (about 250 pull requests a week in 2020), the nixpkgs merge bot, and awesome (submitters review 4 other pull requests) (c73–c83). Several now restrict AI-made submissions (c82).
14. Measured data on size is mixed. Google: first feedback in under 1 hour for small changes and about 5 hours for large ones (c85). MSR 2022 (845k pull requests): size is unrelated to time-to-merge (c84). Review bots raised the number of merged pull requests (c86).

## Hypotheses

- **H11: holds, with a qualification.** Evidence for: c01, c03–c07, c09, c11–c19. Qualifications: pnpm keeps the generated file in the pull request but fixes its conflicts automatically (c20). Post-merge deploys can race (c10). Strict checks force rebuilds (c21). Pushes made with GITHUB_TOKEN don't trigger workflows (c47). Pushing back to a protected main is unsolved, so publish elsewhere or use an App (c11, c65).
- **H13: holds.** Evidence: c24–c39, c48–c53. Qualifications: workload identity federation avoids a stored key (c46). One merged typo removes the first-time approval gate (c28). Fork handling by managed review services is undocumented (c54, c55).
- **H14: holds, with a qualification.** Evidence: c73, c75, c77, c78, c80–c83, c85, c86. Against: one large study found size doesn't predict time-to-merge (c84). Homebrew, tldr and DT allow several items per pull request or still need a human sign-off (c74, c76, c79). On a solo personal repo, the author can't meet a required-approval rule (c62).

## Could not verify

- Whether GitHub's merge button honours `merge=union`.
- Whether a GitHub App ruleset bypass works on personal-account repos.
- DT's current volume (the figures are from 2020).
- winget's volume.
- Copilot review behaviour on forks.
- The year of the newest action release (the page shows "23 Nov" only).
- The full texts of the three arXiv papers. I read only their abstracts.

Blocked: the Homebrew checklist URL (404, s24), two Changesets docs (404, s38, s46), and the GitHub API for the action's tags (refused by this session's proxy; I used the releases page instead).

## Searches that found nothing

- merge=union on docs.github.com (s99)
- a merge queue that regenerates a shared file (s95)
- guidelines that prefer batched pull requests (s97)
- AI review of fork pull requests without secrets (s92)

## Earlier lines: what I checked

The earlier helper wrote s01–s90 and no claims. I kept those lines and added s91–s100.

- **Re-opened and cited:** s01, s03–s12, s14, s15, s17–s19, s21, s23, s26–s37, s39, s41, s42, s44, s45, s47, s49–s53, s56–s62, s65–s67, s69, s71–s74, s78, s80, s81, s87, s88, s90.
- **Re-opened, not cited:** s13, s25, s40, s79.
- **Cited only as empty or 404:** s38, s46, s83, s84.
- **Not re-opened or re-run, and not cited:** s16, s20, s22, s24, s43, s48, s54, s55, s63, s64, s68, s70, s75, s76, s77, s82, s85, s86, s89.

## Session

Model ID: `claude-opus-5-5`. Effort: unknown.
