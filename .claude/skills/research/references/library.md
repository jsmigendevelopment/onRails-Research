# Capture to the library

A research library is one private repo that holds the person's research from every project. Below Full, each capture is a pull request the person merges (on Full this whole file is skipped). The library says where things go in `research-library.json` at its root (shape: `library.schema.json`, next to this file). Follow the manifest, not your memory of a layout.

## When

Capture after these, once the dossier passes its own check:
- every run of the `research` skill, the competitor scan included;
- any research on the strongest tier;
- anything the person calls "deep research", or asks you to "research properly" or "dig into".

A quick lookup (a version, a doc link, one fact) is not captured.

## Find the library

Run `node .agents/skills/research/scripts/research-library.mjs library .`. It reads `[research]` from the personal profile only (`~/.onrails/profile.toml`, or `~/.ai-dev-workflow/profile.toml` before the move) and prints `library` (`owner/repo`) and `library_path` (a local clone, optional). A `library` in the project's `docs/profile.toml` is ignored, and it warns: tell the person to delete it. `offered` (whether the offer was already made) is read from either profile.

`library` set? Go to "Capture". Empty and `offered = false`? Go to "No library yet". Empty and `offered = true`? Skip the capture and say nothing. On Full automation, skip this whole file: no capture, no offer, `offered` left unset. The research's FYI says so.

## Capture

The helper script is `node .agents/skills/research/scripts/research-library.mjs` (below: `rl`). Don't ask the person anything here.

1. **Check it's private:** `rl private <owner/repo>`. It runs `gh api repos/<owner/repo> --jq .private`. Anything but `true` fails it. On a fail, stop the capture, copy nothing, and tell the person the reason it printed, as an FYI. Never fall back to a public repo.
2. **Get a clean checkout.** Use `library_path` if its `origin` is that repo. Otherwise `gh repo clone <owner/repo>` into a scratch folder. Fetch, then branch from `origin/main` in a new worktree: `research/<slug>`. Never commit to the library's `main`.
3. **Read the manifest:** `rl check <library>`. A fail stops the capture; report it.
4. **Get the paths.** Write a vars file: `{"slug": "<topic>", "helpers": ["<helper name>", ...]}`. The slug is the dossier's topic, kebab-case. Taken by another project's entry? Prefix the project: `<project>-<topic>`. Run `rl paths <library> <vars.json>`.
5. **Write the entry** at those paths:
   - the report: the dossier;
   - the store: hypotheses, coverage, sources, claims, the fact-check disposition;
   - the data: measurement runs, byte for byte;
   - the briefs: every role's brief, verbatim. Never rewrite or summarise one;
   - the provenance record, in the format of the schema file at `provenance.schema`. Map each role from the app's `provenance.json`: the exact model ID and effort as each session reported them, the harness and its version, the dates. A value the app's record doesn't have is `unknown`. Never guess one. Brief paths are relative to the store or the root, as `provenance.paths` says.
6. **Add the index entries:** put `date`, `title`, `summary` (two or three sentences), `question`, `decision`, `status`, `recheck`, `model`, `effort` and `project` in the vars file. Run `rl index <library> <vars.json>`. Never touch a file listed in `frozen`.
7. **Run every command in `checks`,** from the library root. A fail: fix the entry and run them again. Still failing after two fixes? Push the branch and open the pull request as a draft that names the failing check.
8. **Commit and open the pull request.** Commit trailers: `Research-Model:` and `Research-Effort:`, as for the dossier. Then `gh pr create --repo <owner/repo> --base main --head research/<slug>`. The body: the project, the question, the recommendation and the check results. Never merge it.

Done when the checks pass and the pull request is open, or step 1 or 3 refused and the person has the reason.

## Privacy

- The library may name private projects. That's fine inside it.
- Nothing goes from the library into another repo: no text, no names, no links.
- A public app gets nothing about the library: no pull request link, no repo name. Tell the person the link in the conversation.
- `library` and `library_path` live in `~/.onrails/profile.toml` only. Never write them into a project. `profile copy` and `init` replace them with a comment, and `doctor` flags a project copy that has them.

## No library yet

Offer once, the first time a capture would run:

> *"Want a private research library? Every deep research from every project would land there as a pull request you merge, so nothing is lost when a project ends. I'd make a private GitHub repo from the onRails template. (Recommended: yes.)"*

- **Yes:**
  1. `npx onrails research-library init <folder>`, for example `~/research-library`.
  2. `git init -b main`, add and commit in that folder.
  3. `gh repo create <github_owner>/research-library --private --source <folder> --push`. The owner comes from `[me] github_owner`; ask if it's empty.
  4. `rl private <owner>/research-library`. It must pass.
  5. In `~/.onrails/profile.toml` (never `docs/profile.toml`), set `library`, `library_path` and `offered = true`.
  6. Capture the research you just finished.
- **No:** set `offered = true` in `~/.onrails/profile.toml`, or in `docs/profile.toml` when there's no home profile (a cloud session). Add a line to `docs/decisions.md`. Never offer again.

Done when the profile says `offered = true`, and on a yes, the library exists, is private and has its first pull request.

## Who runs it

The research session runs step 5's provenance mapping, on its own tier: it knows what each role reported. The copying, the index, the checks and the pull request can go to a helper on the everyday model (see `routing`). That helper adds no role to the record.
