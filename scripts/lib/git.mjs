import { execFileSync } from "node:child_process";

export const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });

/** The commit a pull request branched from, or null when git can't tell. */
export function mergeBase(root, base) {
  try { return git(["merge-base", base, "HEAD"], root).trim(); }
  catch { return null; }
}

export const LINK_MODE = "120000";

// File lists come NUL-separated and unquoted. With git's default core.quotepath, a name such as
// .github/workflows/ü.yml comes back as "\303\274"-escaped text in quotes, which no rule matches.
const list = (args, root) => git(["-c", "core.quotepath=off", ...args, "-z"], root).split("\0").filter(Boolean);

/** Every file git tracks or would add: tracked plus untracked, ignoring what .gitignore excludes. */
export const listedFiles = (root) => list(["ls-files", "--cached", "--others", "--exclude-standard"], root);

/**
 * Files that differ between a commit and the working tree, as [{ status: "A"|"M"|"D", path, mode }].
 * `mode` is the git mode after the change (120000 is a symbolic link). Renames count as a delete and an add.
 */
export function changedFiles(root, from) {
  // With -z, --raw gives ":<old mode> <new mode> <sha> <sha> <status>" and then the path, as two fields.
  const fields = list(["diff", "--raw", "--no-renames", from], root);
  const changes = [];
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const [, mode, , , status] = fields[i].split(" ");
    changes.push({ status: status[0], path: fields[i + 1], mode });
  }
  for (const path of list(["ls-files", "--others", "--exclude-standard"], root)) changes.push({ status: "A", path, mode: null });
  return changes;
}

/** Tracked files that git stores as symbolic links. */
export function trackedLinks(root) {
  return list(["ls-files", "--stage"], root).filter((entry) => entry.startsWith(`${LINK_MODE} `)).map((entry) => entry.slice(entry.indexOf("\t") + 1));
}

/** A file's text at a commit, or null when it isn't there. */
export function fileAt(root, commit, path) {
  try { return git(["show", `${commit}:${path}`], root); }
  catch { return null; }
}
