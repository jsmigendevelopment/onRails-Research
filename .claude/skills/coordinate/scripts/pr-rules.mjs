#!/usr/bin/env node
// The pull request rules for a project whose stack has no `pr:rules` script (#225). `coordinate` step 6.1.3 runs it
// from your checkout of main, never from the head's clone:
//   node pr-rules.mjs <n> --repo owner/name --head <sha>
// The same rules as the TanStack pack's `pnpm pr:rules`: the description closes an issue (Closes, Fixes or
// Resolves #<n>), the branch is feat/<n>-name or fix/<n>-name for that issue, unless the pull request has the
// `no-issue` label or Dependabot opened it; and at most 400 changed lines, unless it has the `large-pr` label.
// Lockfiles don't count, nor files main marks `linguist-generated` in a .gitattributes committed in the checkout that
// holds this script. A rename skips only when its old and new names both do, so a file can't hide its changes by
// moving into a skipped path. The pull request comes from the API as data; none of its code runs.
// Exit 0: every rule holds. 1: a rule is broken, the head moved, or GitHub's file list stops short of the pull
// request (it lists at most 3000 files) on two reads in a row. 2: a usage or API error, or counts that don't add up
// on two reads in a row. Never a pass.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_FILES, changedPaths, gh, pages, prArgs } from "./agent-files.mjs";

const MAX_CHANGED_LINES = 400;
export const LOCKFILES = /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|bun\.lockb?|deno\.lock|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|go\.sum)$/;
const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/i;
const BRANCH = /^(?:feat|fix)\/(\d+)-[a-z0-9][a-z0-9-]*$/;
const HERE = dirname(fileURLToPath(import.meta.url));

// git never gets a token, and starts nothing the checkout's config names: a command a pull request ran may have
// written that config. Its own variables go too, so none points it at another repo or config file. Paths match by
// case, as GitHub's do, even where `git init` sets core.ignorecase on a case-insensitive disk.
const UNSAFE_ENV = /TOKEN|SECRET|PASSWORD|API_KEY|^GIT_|^GH_|^GITHUB_/i;
const SAFE_GIT = ["-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", "-c", "core.attributesFile=/dev/null", "-c", "core.ignorecase=false"];

/** git with SAFE_GIT, no token, and no global or system config or attributes. Its output as text; throws when it fails. */
function git(args, { cwd, input } = {}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !UNSAFE_ENV.test(name)));
  const r = spawnSync("git", [...SAFE_GIT, ...args], {
    cwd, input, encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
    // GIT_CONFIG_NOSYSTEM doesn't cover $(prefix)/etc/gitattributes, which the user owns under Homebrew.
    env: { ...env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_ATTR_NOSYSTEM: "1" },
  });
  if (r.status !== 0) throw new Error(`git ${args[0]}: ${String(r.stderr || r.error?.message || `exit ${r.status}`).trim()}`);
  return r.stdout;
}

/** Main's committed .gitattributes files, { path: text }: those at HEAD in the checkout that holds this script. */
function mainAttributes() {
  const root = git(["rev-parse", "--show-toplevel"], { cwd: HERE }).trim();
  const files = {};
  for (const entry of git(["ls-tree", "-r", "-z", "--full-tree", "HEAD"], { cwd: root }).split("\0")) {
    const [, sha, path] = /^100(?:644|755) blob ([0-9a-f]+)\t(.+)$/s.exec(entry) ?? [];
    if (!path || !/(?:^|\/)\.gitattributes$/.test(path)) continue;
    if (path.split("/").some((part) => part === ".." || part.toLowerCase() === ".git")) throw new Error(`main's tree holds an unsafe path: ${path}`);
    files[path] = git(["cat-file", "blob", sha], { cwd: root });
  }
  return files;
}

/** The paths main's committed .gitattributes mark `linguist-generated`. They're copied into an empty repo and checked
 * there, so no info/attributes, global or system attributes file, working folder or head can add to them. */
export function generated(paths) {
  if (!paths.length) return new Set();
  const scratch = mkdtempSync(join(tmpdir(), "onrails-attributes-"));
  try {
    const repo = join(scratch, "repo");
    mkdirSync(join(scratch, "no-templates"));
    git(["init", "-q", `--template=${join(scratch, "no-templates")}`, repo]);
    for (const [path, text] of Object.entries(mainAttributes())) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), text);
    }
    const out = git(["check-attr", "-z", "--stdin", "linguist-generated"], { cwd: repo, input: paths.join("\0") }).split("\0");
    const marked = new Set();
    for (let i = 0; i + 2 < out.length; i += 3) if (out[i + 2] === "set" || out[i + 2] === "true") marked.add(out[i]);
    return marked;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Every reason the pull request isn't tied to an issue. Empty when it is. */
export function linkProblems({ body, branch, labels, author }) {
  if (author === "dependabot[bot]" || labels.includes("no-issue")) return [];
  const closes = CLOSES.exec(body);
  const named = BRANCH.exec(branch);
  const problems = [];
  if (!closes) problems.push("The description needs `Closes #<issue>` (or Fixes / Resolves).");
  if (!named) problems.push(`The branch "${branch}" must look like feat/<issue>-short-name or fix/<issue>-short-name.`);
  if (closes && named && closes[1] !== named[1]) problems.push(`The branch names issue #${named[1]} but the description closes #${closes[1]}.`);
  return problems;
}

/** Lines added plus removed, without lockfiles and generated files. A rename skips only when both its names do. */
export function changedLines(files, isGenerated) {
  const skipped = (path) => LOCKFILES.test(path) || isGenerated.has(path);
  return files
    .filter((f) => !skipped(f.filename) || (f.previous_filename && !skipped(f.previous_filename)))
    .reduce((sum, f) => sum + (f.additions ?? 0) + (f.deletions ?? 0), 0);
}

/** One entry per path, the first: a file GitHub lists twice counts once, and can't stand in for one it left out. */
function distinct(files) {
  const seen = new Set();
  return files.filter((f) => !seen.has(f.filename) && seen.add(f.filename));
}

/** Why GitHub's list and totals can't be counted, or null. `cut` when the list stops at GitHub's cap. */
function listProblem(pull, files, pr) {
  const { changed_files: changed, additions, deletions } = pull;
  if (![changed, additions, deletions].every(Number.isInteger)) return { why: `GitHub gave no file or line count for #${pr}, so the size can't be counted.` };
  if (changed > MAX_FILES) return { cut: true, why: `GitHub listed ${files.length} of the ${changed} files #${pr} changes, twice (its list stops at ${MAX_FILES}), so the size can't be counted. Split the pull request.` };
  if (files.length !== changed) return { why: `GitHub listed ${files.length} different files, but #${pr} changes ${changed}, so the size can't be counted.` };
  const sum = files.reduce((total, f) => total + (f.additions ?? 0) + (f.deletions ?? 0), 0);
  if (sum !== additions + deletions) return { why: `#${pr}'s files add up to ${sum} changed lines, but #${pr} says ${additions + deletions}, so the size can't be counted.` };
  return null;
}

/** The pull request, its files, then the pull request again, so the files belong to the head both reads name. */
function read(repo, pr) {
  const first = JSON.parse(gh(`repos/${repo}/pulls/${pr}`));
  const files = distinct(pages(`repos/${repo}/pulls/${pr}/files`));
  return { first, files, pull: JSON.parse(gh(`repos/${repo}/pulls/${pr}`)) };
}

export function main(argv) {
  const { pr, repo, head } = prArgs(argv);
  if (!pr || !repo || !/^[0-9a-f]{40}$/.test(head ?? "")) {
    console.error("Usage: pr-rules.mjs <n> --repo <owner>/<name> --head <40-character sha>");
    return 2;
  }
  let got;
  let problem;
  // A list that doesn't add up is read once more, then decided: a retry every sweep would never end.
  for (let round = 0; round < 2; round++) {
    try {
      got = read(repo, pr);
    } catch (error) {
      console.error(`Couldn't read #${pr} from the API: ${String(error.stderr || error.message).trim()}`);
      return 2;
    }
    const moved = [got.first, got.pull].find((p) => p.head?.sha !== head);
    if (moved) {
      console.error(`The head moved: #${pr} is at ${moved.head?.sha}, not ${head}. Check the new head.`);
      return 1;
    }
    problem = listProblem(got.pull, got.files, pr);
    if (!problem) break;
  }
  if (problem) {
    console.error(problem.cut ? `${problem.why} That's a fail, never a pass.` : `${problem.why} That's never a pass: try again next sweep.`);
    return problem.cut ? 1 : 2;
  }
  const { pull, files } = got;
  const labels = (pull.labels ?? []).map((l) => l.name);
  const branch = pull.head.ref ?? "";
  const problems = linkProblems({ body: pull.body ?? "", branch, labels, author: pull.user?.login });
  let lines;
  try {
    lines = changedLines(files, generated(changedPaths(files)));
  } catch (error) {
    console.error(`Couldn't read main's .gitattributes, so the size can't be counted: ${error.message}`);
    return 2;
  }
  if (lines > MAX_CHANGED_LINES && !labels.includes("large-pr")) {
    problems.push(`${lines} changed lines (over ${MAX_CHANGED_LINES}, lockfiles and generated files not counted). Split the pull request, or add the large-pr label and say why in the description.`);
  }
  for (const problem of problems) console.error(problem);
  if (problems.length) return 1;
  const closes = CLOSES.exec(pull.body ?? "")?.[1];
  console.log(`#${pr} @ ${head}: ${closes ? `closes #${closes} from ${branch}` : "needs no issue link"}, ${lines} changed lines.`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
