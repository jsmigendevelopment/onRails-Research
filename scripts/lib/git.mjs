import { execFileSync } from "node:child_process";

export const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });

/** The commit a pull request branched from, or null when git can't tell. */
export function mergeBase(root, base) {
  try { return git(["merge-base", base, "HEAD"], root).trim(); }
  catch { return null; }
}

export const LINK_MODE = "120000";

/**
 * Files that differ between a commit and the working tree, as [{ status: "A"|"M"|"D", path, mode }].
 * `mode` is the git mode after the change (120000 is a symbolic link). Renames count as a delete and an add.
 */
export function changedFiles(root, from) {
  const tracked = git(["diff", "--raw", "--no-renames", from], root);
  const untracked = git(["ls-files", "--others", "--exclude-standard"], root);
  const changes = tracked.split("\n").filter(Boolean).map((line) => {
    const [meta, ...rest] = line.split("\t");
    const [, mode, , , status] = meta.split(" ");
    return { status: status[0], path: rest.join("\t"), mode };
  });
  for (const path of untracked.split("\n").filter(Boolean)) changes.push({ status: "A", path, mode: null });
  return changes;
}

/** Tracked files that git stores as symbolic links. */
export function trackedLinks(root) {
  return git(["ls-files", "--stage"], root).split("\n").filter((line) => line.startsWith(`${LINK_MODE} `)).map((line) => line.split("\t").slice(1).join("\t"));
}

/** A file's text at a commit, or null when it isn't there. */
export function fileAt(root, commit, path) {
  try { return git(["show", `${commit}:${path}`], root); }
  catch { return null; }
}
