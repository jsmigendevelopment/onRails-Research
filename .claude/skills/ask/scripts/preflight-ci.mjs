// No GitHub Actions (#133, part of #98): does a repo on ci = "local" still have workflow files, or Actions on?
// preflight prints a warning under its table, doctor a ✗ line, and `npx onrails ci local` fixes both.
// Before the repo is read (#169, #182), it only reads files: the Actions setting is asked of GitHub after the
// read, or by doctor and the CLI in the person's own terminal.
// The master copy is scripts/preflight-ci.mjs; sync-skills.mjs copies it wherever preflight.mjs goes. No dependencies.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

/** The one command that moves a repo off Actions. */
export const CI_FIX = "npx onrails ci local";

// The same rule and lookup as setup-github.mjs, push-secrets.mjs, connect and ci-mode.ts (#160): "actions" only
// for a `ci = "actions"` line (a trailing # comment allowed) in the nearest docs/stack.md from dir up to the folder
// holding .git.
const CI_ACTIONS = /^ci[ \t]*=[ \t]*"actions"[ \t]*(?:#.*)?\r?$/m;

// Only a regular file under 1 MB is read: a symlink to a device, or a huge file, could stall preflight.
function text(file) {
  try {
    const s = statSync(file);
    return s.isFile() && s.size < 1 << 20 ? readFileSync(file, "utf8") : "";
  } catch {
    return ""; // gone between the check and the read: no ci line
  }
}

/** "actions" or "local" for the repo, or the app folder, at dir. */
export function ciMode(dir) {
  let top = dir;
  for (let d = dir; dirname(d) !== d; d = dirname(d)) {
    if (existsSync(join(d, ".git"))) { top = d; break; }
  }
  for (let d = dir; ; d = dirname(d)) {
    const stack = join(d, "docs", "stack.md");
    if (existsSync(stack)) return CI_ACTIONS.test(text(stack)) ? "actions" : "local";
    if (d === top || dirname(d) === d) return "local";
  }
}

/** The files directly in dir/.github/workflows/, where GitHub looks, as repo paths, sorted. A symlinked folder counts as none. */
export function workflowFiles(dir) {
  const folder = join(dir, ".github", "workflows");
  let entries;
  try {
    if (!lstatSync(folder).isDirectory()) return [];
    entries = readdirSync(folder, { withFileTypes: true });
  } catch {
    return []; // no folder, or one that can't be read: nothing GitHub runs from here
  }
  return entries.filter((e) => !e.isDirectory()).map((e) => `.github/workflows/${e.name}`).sort();
}

const PART = /^(?!\.+$)[\w.-]+$/;
/** owner/name for a github.com remote URL (https, ssh or scp form), or null. */
export function githubRepo(url = "") {
  const m = /^(?:https:\/\/(?:[^@/\s]+@)?github\.com\/|ssh:\/\/git@github\.com(?::\d+)?\/|git@github\.com:)([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/
    .exec(String(url).trim());
  return m && PART.test(m[1]) && PART.test(m[2]) ? `${m[1]}/${m[2]}` : null;
}

/** From GET /repos/{owner}/{repo}/actions/permissions: true when Actions is on, false when off, null for any other answer. */
export function actionsOn(json) {
  try {
    const enabled = JSON.parse(json)?.enabled;
    return typeof enabled === "boolean" ? enabled : null;
  } catch {
    return null; // not that API's answer: unknown, never "off"
  }
}

/**
 * preflight's warnings. Before the read (read false, or no sys) only files are read. After it, sys.run asks git
 * for the remote and GitHub for the Actions setting, from the repo, as the GitHub row does then.
 */
export async function ciWarnings(dir, sys, read) {
  if (ciMode(dir) === "actions") return [];
  const out = [];
  const files = workflowFiles(dir);
  if (files.length) out.push(`${files.length} workflow file(s) in .github/workflows/, on ci = "local". Fix: \`${CI_FIX}\` removes them in a pull request and turns Actions off.`);
  if (!read || !sys) return out;
  const remote = await sys.run("git", ["remote", "get-url", "origin"], { cwd: dir });
  const repo = remote?.ok ? githubRepo(remote.out.split("\n")[0]) : null;
  if (!repo) return out;
  const perms = await sys.run("gh", ["api", `repos/${repo}/actions/permissions`], { cwd: dir });
  if (perms?.ok && actionsOn(perms.out) === true) out.push(`GitHub Actions is on for ${repo}, on ci = "local". Fix: \`${CI_FIX}\` turns it off.`);
  return out;
}
