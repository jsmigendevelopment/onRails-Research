import { execFileSync } from "node:child_process";

export const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });

/** The commit a pull request branched from, or null when git can't tell. */
export function mergeBase(root, base) {
  try { return git(["merge-base", base, "HEAD"], root).trim(); }
  catch { return null; }
}

/** Files that differ between a commit and the working tree, as [{ status: "A"|"M"|"D", path }]. Renames count as a delete and an add. */
export function changedFiles(root, from) {
  const tracked = git(["diff", "--name-status", "--no-renames", from], root);
  const untracked = git(["ls-files", "--others", "--exclude-standard"], root);
  const changes = tracked.split("\n").filter(Boolean).map((line) => {
    const [status, ...rest] = line.split("\t");
    return { status: status[0], path: rest.join("\t") };
  });
  for (const path of untracked.split("\n").filter(Boolean)) changes.push({ status: "A", path });
  return changes;
}

/** A file's text at a commit, or null when it isn't there. */
export function fileAt(root, commit, path) {
  try { return git(["show", `${commit}:${path}`], root); }
  catch { return null; }
}
