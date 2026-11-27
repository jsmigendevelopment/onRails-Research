// Does a Dependabot pull request only bump versions (#226)? own-branch.mjs calls it for a pull request opened by
// dependabot[bot] from a branch in the repo. The opener alone proves nothing about the commits: anyone who can push
// to the branch can add one. So a bump passes only when all of these hold, and fails closed otherwise:
// - every changed file is a modified package.json or an npm-family text lockfile, outside the agent and GitHub
//   folders: none added, removed or renamed;
// - every commit is authored by dependabot[bot], committed by it or GitHub's web-flow, and verified;
// - each package.json, read at the merge base and at the head, differs only in the versions of existing entries of
//   its dependency fields, and each new version is a node-semver range npm reads as a registry spec;
// - each lockfile points every new package source at the npm registry: npm's JSON lockfiles judged by their parsed
//   values, pnpm's and yarn's by each new line, with any escape or unknown source form refused.
// It reads the API only. A read with no answer throws, which own-branch.mjs turns into exit 2.
import { isDeepStrictEqual } from "node:util";
import { RULE_FILES } from "./agent-files.mjs";

const ONLY = "The local gate only runs the loop's own branches.";
export const DEPENDABOT = "dependabot[bot]";
// Dependabot's signed commits name GitHub's web-flow as committer.
const COMMITTERS = new Set([DEPENDABOT, "web-flow"]);
const BUMP_BRANCH = /^dependabot(?:\/[A-Za-z0-9._-]+)+$/;
// npm's manifest and text lockfiles, the ecosystem the packs' Dependabot config names. pnpm-workspace.yaml and .npmrc
// stay out: they decide which install scripts run and where packages come from. Bun's lockfiles stay out: no pack
// uses Bun, and bun.lockb is binary, so it can't be read.
const MANIFEST = /(?:^|\/)package\.json$/;
const LOCKFILE = /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock)$/;
const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
// A node-semver range: comparators and x-ranges joined by spaces and ||, or a hyphen range. No ":", "/", "@" or "#",
// so npm-package-arg reads it as no URL, git, GitHub, file, link, workspace or alias spec, and no dist-tag.
const NR = String.raw`(?:0|[1-9]\d*)`;
const XR = String.raw`(?:[xX*]|${NR})`;
const IDS = String.raw`[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*`;
const PARTIAL = String.raw`v?${XR}(?:\.${XR}(?:\.${XR}(?:-${IDS})?(?:\+${IDS})?)?)?`;
const SIMPLE = String.raw`(?:(?:[~^]|[<>]=?|=) *)?${PARTIAL}`;
const RANGE = String.raw`(?:${PARTIAL} +- +${PARTIAL}|${SIMPLE}(?: +${SIMPLE})*)`;
const VERSION = new RegExp(String.raw`^ *${RANGE}(?: *\|\| *${RANGE})* *$`);
// npm-package-arg's own test: a spec with this ending is a local tarball, even when it also reads as a range.
const TARBALL_FILE = /[.](?:tgz|tar.gz|tar)$/i;
const REGISTRY = /^https:\/\/registry\.(?:npmjs\.org|yarnpkg\.com)\//;
// A registry URL inside a lockfile line, not inside a longer URL or scheme such as git+https://.
const REGISTRY_IN = /(?<![\w+.:/-])https:\/\/registry\.(?:npmjs\.org|yarnpkg\.com)\/[^\s"',)}\]\\]*/g;
// A checksum as pnpm and yarn write it: its key first on the line or first in a flow mapping. Base64 can hold "//",
// so it's removed before the check below.
const INTEGRITY = /(?<=(?:^\s*|\{)integrity:?\s+)sha(?:1|256|384|512)-[A-Za-z0-9+/]+={0,2}(?=[\s,}]|$)/g;
// What's left of a new line once its registry URLs and checksums are gone. Any "//" or ":/" is another URL, or a scheme-relative
// one that pnpm resolves against the registry onto another host; a backslash is a YAML or JSON escape that can hide
// any word below from these patterns but not from the parser.
const OFF_REGISTRY = /\/\/|:\/|\\/;
// Specs that resolve outside the registry, as a lockfile writes them: pnpm's link:, file: and directory resolutions,
// workspace links, yarn's portal: and patch:. An npm: alias stays on the registry.
const NOT_REGISTRY = /(?:^|[\s"'(@,{])(?:file|link|directory|workspace|git|git\+[a-z]+|github|gitlab|bitbucket|gist|ssh|portal|patch|exec):/i;
// pnpm's and yarn's keys that name where a package comes from, with the value on the line or not. A resolved or
// tarball value must be a registry URL; a git or directory resolution's own keys are refused unless the value is a
// version (a dependency named "type").
const SOURCE_KEY = /(?:^|[\s{,'"?])(?:resolved|tarball)['"]?(?:\s*:|\s+|$)(?!\s*['"]?https:\/\/registry\.(?:npmjs\.org|yarnpkg\.com)\/)/i;
const RESOLUTION_KEY = /(?:^|[\s{,'"?])(?:type|repo|commit|directory|path)['"]?\s*(?::(?!\s*\d)|$)/i;
// YAML that pnpm and yarn never write and that can split a key from its value: an explicit "? key", or a comment.
const YAML_SPLIT = /(?:^|[\s{,[])\?(?:\s|$)|(?:^|\s)#/;
const NPM_LOCK = /(?:^|\/)(?:package-lock|npm-shrinkwrap)\.json$/;
// A package-lock version: exact semver, or an npm: alias of one, which stays on the registry.
const LOCKED_VERSION = /^(?:npm:(?:@[\w.-]+\/)?[\w.-]+@)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// Where npm installs a registry package: node_modules folders only, never a link target or a path that climbs out.
const INSTALL_PATH = /^node_modules\/(?:@[\w.-]+\/)?\w[\w.-]*(?:\/node_modules\/(?:@[\w.-]+\/)?\w[\w.-]*)*$/;

/** A file list that can't be trusted for the head: short, or read while the head moved. Exit 2, never a pass. */
export class Unsettled extends Error {}

const refuse = (why) => ({ pass: false, why: `${why} ${ONLY}` });
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Why a manifest change is more than version bumps, or null. `before` and `after` are the file's texts. */
export function manifestChange(before, after) {
  let a;
  let b;
  try {
    [a, b] = [JSON.parse(before), JSON.parse(after)];
  } catch {
    return "isn't valid JSON at both ends";
  }
  if (!isObject(a) || !isObject(b)) return "isn't a JSON object at both ends";
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!DEP_FIELDS.includes(key)) {
      if (!isDeepStrictEqual(a[key], b[key])) return `changes "${key}", which isn't a dependency field`;
      continue;
    }
    const [from, to] = [a[key], b[key]];
    if (!isObject(from) || !isObject(to)) return `"${key}" isn't an object at both ends`;
    const names = Object.keys(from);
    if (names.length !== Object.keys(to).length || !names.every((n) => Object.hasOwn(to, n))) return `adds or removes a package in "${key}"`;
    for (const name of names) {
      if (from[name] === to[name]) continue;
      const v = to[name];
      if (typeof v !== "string" || !VERSION.test(v) || TARBALL_FILE.test(v)) return `sets ${key}.${name} to something other than a registry version`;
    }
  }
  return null;
}

/** Why one value in npm's parsed lockfile, new or changed since the merge base, leaves the registry, or null. */
function npmValueChange(key, value, path, isNew) {
  if (key === "link") return "links a package to a local folder, not the npm registry";
  if (key === "resolved" && (typeof value !== "string" || !REGISTRY.test(value) || OFF_REGISTRY.test(value.replace(REGISTRY, "")))) return `resolves a package to ${JSON.stringify(value)}, not the npm registry`;
  if (key === "version" && (typeof value !== "string" || !LOCKED_VERSION.test(value))) return `sets a package's version to ${JSON.stringify(value)}, not a version on the npm registry`;
  if (isNew && path.length === 1 && path[0] === "packages" && !INSTALL_PATH.test(key)) return `adds the package path ${JSON.stringify(key)}, not a node_modules folder on the npm registry`;
  return null;
}

/** Why npm's lockfile, parsed at both ends, has a new or changed source off the registry, or null. */
function npmLockChange(before, after) {
  let a;
  let b;
  try {
    [a, b] = [JSON.parse(before), JSON.parse(after)];
  } catch {
    return "isn't valid JSON at both ends";
  }
  if (!isObject(b)) return "isn't a JSON object";
  const walk = (from, to, path) => {
    for (const [key, value] of Object.entries(to)) {
      const isNew = !isObject(from) || !Object.hasOwn(from, key);
      const old = isNew ? undefined : from[key];
      if (isDeepStrictEqual(old, value)) continue;
      const why = npmValueChange(key, value, path, isNew);
      if (why) return why;
      if (value !== null && typeof value === "object") {
        const deeper = walk(old, value, [...path, key]);
        if (deeper) return deeper;
      }
    }
    return null;
  };
  return walk(a, b, []);
}

/** Why a pnpm or yarn lockfile line that isn't at the merge base points outside the npm registry, or null. */
function textLineChange(line) {
  const rest = line.replace(REGISTRY_IN, " ").replace(INTEGRITY, " ");
  if ([OFF_REGISTRY, NOT_REGISTRY, YAML_SPLIT].some((re) => re.test(rest)) || SOURCE_KEY.test(line) || RESOLUTION_KEY.test(line)) {
    return `points a package off the npm registry: ${line.trim().slice(0, 120)}`;
  }
  return null;
}

/** Why a lockfile's new sources point outside the npm registry, or null. Lines already at the merge base aren't judged. */
export function lockfileChange(before, after, path = "pnpm-lock.yaml") {
  if (NPM_LOCK.test(path)) return npmLockChange(before, after);
  const old = new Set(before.split(/\r?\n/));
  for (const line of after.split(/\r?\n/)) {
    if (old.has(line)) continue;
    const why = textLineChange(line);
    if (why) return why;
  }
  return null;
}

/** Why a commit isn't Dependabot's own, or null. */
const notDependabots = ({ sha, author, committer, commit }) => {
  if (author?.login !== DEPENDABOT) return `${sha} is authored by ${author?.login ?? "an account GitHub can't name"}`;
  if (!COMMITTERS.has(committer?.login)) return `${sha} is committed by ${committer?.login ?? "an account GitHub can't name"}`;
  if (commit?.verification?.verified !== true) return `${sha} isn't verified`;
  return null;
};

/**
 * Pass for a Dependabot pull request that only bumps versions. `read` gives `files()` (every file, for the head),
 * `commits()` (every commit), `mergeBase()` (the merge base's sha) and `text(path, sha)` (a file's text at a commit).
 * Each is called only once the checks before it pass.
 */
export function dependabotBump(pull, read) {
  const { number, changed_files: total, commits: count, head: { ref = "", sha } = {} } = pull;
  if (!BUMP_BRANCH.test(ref)) return refuse(`Dependabot's ${ref} isn't a dependabot/ branch with only letters, digits, dots, dashes and underscores.`);
  if (total > 3000) return refuse(`#${number} changes ${total} files, more than GitHub lists (3000).`);
  const files = read.files();
  if (!files.length) return refuse(`#${number} changes no files, so there's no bump to check.`);
  const other = files.filter((f) => f.status !== "modified" || f.previous_filename || RULE_FILES.test(f.filename) || !(MANIFEST.test(f.filename) || LOCKFILE.test(f.filename)));
  if (other.length) return refuse(`Dependabot's #${number} changes more than existing manifests and lockfiles: ${other.map((f) => `${f.filename} (${f.status})`).join(", ")}.`);
  const commits = read.commits();
  if (commits.length !== count || commits.at(-1)?.sha !== sha) throw new Unsettled(`GitHub listed ${commits.length} commits ending at ${commits.at(-1)?.sha}, but #${number} has ${count} ending at ${sha}`);
  const stranger = commits.map(notDependabots).find(Boolean);
  if (stranger) return refuse(`Not every commit on #${number} is Dependabot's: ${stranger}.`);
  const base = read.mergeBase();
  for (const { filename } of files) {
    const change = (MANIFEST.test(filename) ? manifestChange : lockfileChange)(read.text(filename, base), read.text(filename, sha), filename);
    if (change) return refuse(`Dependabot's #${number}: ${filename} ${change}.`);
  }
  return { pass: true, why: `${sha}: ${ref} is a Dependabot bump of dependency versions only` };
}
