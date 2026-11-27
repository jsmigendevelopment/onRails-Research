#!/usr/bin/env node
// SessionStart hook for Claude Code (.claude/settings.json) and Codex (.codex/hooks.json):
// give every new session the project's state up front. Local files and git only (no
// network, no GitHub API calls). Prints plain text to stdout, which both tools add to
// the session's context. Ignores the hook's stdin. Never fails the session.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Claude Code sets CLAUDE_PROJECT_DIR. Codex runs hooks in the session's folder, which
// may be a subfolder, so climb to the git root.
const start = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const gitIn = (cwd, args) => { try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
const root = gitIn(start, ["rev-parse", "--show-toplevel"]) || start;
const read = (p) => { try { return readFileSync(join(root, p), "utf8"); } catch { return null; } };
const git = (args) => gitIn(root, args);

const out = ["## Project state (from the session-start hook)"];

// .ai-dev-workflow.json is the record's name before the rename to onRails.
const manifest = read(".onrails.json") ?? read(".ai-dev-workflow.json");
if (manifest) { try { out.push(`- Kit: v${JSON.parse(manifest).kitVersion}`); } catch {} }

const branch = git(["branch", "--show-current"]);
if (branch) {
  const dirty = git(["status", "--porcelain"]).split("\n").filter(Boolean).length;
  out.push(`- Branch: ${branch}${dirty ? `, ${dirty} uncommitted file(s)` : ", clean"}`);
  const last = git(["log", "-1", "--format=%cr: %s"]);
  if (last) out.push(`- Last commit: ${last}`);
}

if (existsSync(join(root, "docs/profile.toml"))) out.push("- Profile: docs/profile.toml (defaults to confirm, not ask)");

const state = read("docs/state.md");
if (state) {
  out.push("", "### docs/state.md", state.split("\n").slice(0, 30).join("\n").trim());
  out.push("", "For the full report (what merged, what's waiting, who else is working), use the `back` skill.");
} else if (existsSync(join(root, "kickoff"))) {
  out.push("- A kickoff is in progress in kickoff/. Use the `back` skill to resume it.");
} else {
  out.push("- No docs/state.md yet. New app: the `idea` skill. Existing repo: the `join` skill.");
}

process.stdout.write(out.join("\n") + "\n");

// Background processes an ended session left running (#126): the registry lists them, so this session stops them.
const procs = join(root, ".agents/skills/ask/scripts/procs.mjs");
if (existsSync(procs)) {
  const r = spawnSync(process.execPath, [procs, "session-start"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 8000 });
  if (r.stdout?.trim()) process.stdout.write(`\n${r.stdout.trim()}\n`);
}

// Opt-in work log (writes only if the profile turns it on; never inside the repo).
const worklog = join(root, ".agents/skills/afk/scripts/worklog.mjs");
if (existsSync(worklog)) spawnSync(process.execPath, [worklog, "log", "session-start"], { cwd: root, stdio: "ignore", timeout: 3000 });
