---
name: update
description: Use when the person wants onRails brought to its latest version ("/update", "update onRails", "get the latest onRails", "update the plugin", "is onRails up to date") - runs `npx onrails@latest update --all` from a temp folder outside the project, which updates the Claude Code and Codex plugins, the global entry skills and this project's kit, runs doctor and prints each part's version before and after, then tells the person to run `/reload-plugins`.
---

# /update: bring onRails to its latest

One command updates every part this machine and folder have. It only installs the latest release. Never bump a version, tag or publish.

Always run the CLI from a new temp folder outside the project, and pass the project root: the folder with `.onrails.json`, or the current folder outside a project. Run from inside the project, npx can start an `onrails` or `claude` the project ships. The commands below name the folder under `/tmp`, because a bare `mktemp -d` follows `TMPDIR`, which can point into the project. No `mktemp` (PowerShell)? Make a new folder under `$env:TEMP`, or under your home folder when `$env:TEMP` is inside the project, and run from there. The folder's real path is inside the project? Make another under your home folder.

## Steps

1. **Read the automation level** from "Automation level" in `docs/stack.md`. No section, or no project here? The default is `[defaults] automation` in the profile (`docs/profile.toml`, else `~/.onrails/profile.toml`), else Recommended.
2. **Show the plan.** Run `(cd "$(mktemp -d /tmp/onrails-update.XXXXXX)" && npx --yes onrails@latest update "<project root>" --all --dry-run)`. It runs nothing and writes nothing. It lists the four parts:
   1. the plugin commands it would run, for each tool whose plugin is installed;
   2. the global entry skills, when `init --global` was used;
   3. the project kit, when this folder is an onRails project;
   4. `doctor`.
   - npx fails (no network, or the registry is blocked)? With the kit here, climb "Try before you block" in `ask` first. Still blocked? Use the plugin's own CLI. Find the plugin's folder, first match wins:
     1. `${CLAUDE_PLUGIN_ROOT}`, when it shows a real path (Codex and a project's copy of this skill leave the `$` and braces);
     2. the `installPath` of `core@onrails` in `~/.claude/plugins/installed_plugins.json` (Claude Code; under `$CLAUDE_CONFIG_DIR/plugins` when that's set);
     3. the newest version folder in `~/.codex/plugins/cache/onrails/or/` (Codex; under `$CODEX_HOME` when that's set).

     Never use a folder inside the project, whatever these say, and never the folder this `SKILL.md` is in: a project's copy sits in the project. Then run `(cd "$(mktemp -d /tmp/onrails-update.XXXXXX)" && node "<plugin folder>/cli/bin/cli.mjs" update "<project root>" --all --dry-run)`. Say that it brings only the kit this plugin carries, not the newest release.
   - No plugin installed? There's no fallback: it's a 🛑 blocker, with this one command for the person to run where npx works: `npx --yes onrails@latest update "<project root>" --all`.
3. **Go ahead.** **On Full,** ask nothing: go to step 4 and put the plan in your report. **Below Full,** show the plan and ask once: "Run it?" A no ends it here.
4. **Run it:** the same command without `--dry-run` (or the same fallback). Show the person what it printed: the summary of each part, before and after, and every "Left for you" line.
   - A tool was skipped with a by-hand command? That command is for the person. Show it, and never run it yourself: only the person knows the tool is theirs and not one the project ships.
   - A plugin command failed? Show the command and its error, then run that one command again once. Still failing? Record it as a 🛑 blocker through `ask`, with the command as the "Setup step for you".
   - The project kit changed? Its files aren't committed. They reach main through a pull request, like any change (`AGENTS.md`, rule 12). A changed `AGENTS.md`, `.agents/` or `.claude/` gets the weakening review (`coordinate`, Rules).
   - Kept files (`.onrails-new`)? List them. `/join` merges the project's; the global ones are compared by hand.

**No kit here** (no `ask` skill, as outside an onRails project)? A blocker goes at the top of your report instead, as a "Setup step for you": the one command to run, where to run it, and the error it gave. The project kit was skipped, so nothing needs a pull request.

**Done when** the summary is shown and you've told the person the last step.

Claude Code can't reload a running session's plugins itself, so end with this line, word for word: "Last step: run `/reload-plugins` (Claude Code) or start a new session (Codex)."
