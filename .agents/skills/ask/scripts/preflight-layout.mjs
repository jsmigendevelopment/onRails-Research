// Preflight's repo layout (#182): which folders are this repository, read the way the system and git read them, and
// the PATH and temp folders the probes get before the read, outside all of them. Nothing here runs git.
// The master copy is scripts/preflight-layout.mjs in the kit; sync-skills.mjs copies it next to each preflight.mjs.
import { lstatSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { notOwnFolder, othersCanSwapIn, othersCanWrite } from "./preflight-owner.mjs";

/** Something about the layout can't be read or isn't what git writes: the caller fails closed. */
class Unknown extends Error {}
const unknown = (path, why) => new Unknown(`${path}: ${why?.code ?? why}`);
// Nothing at that path: no file there, or a file where a folder was expected.
const GONE = new Set(["ENOENT", "ENOTDIR"]);

/** True when something is at path (a symlink is not followed); false when nothing is. Any other error is Unknown. */
function there(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (GONE.has(error.code)) return false;
    throw unknown(path, error);
  }
}

// Node's resolve() and join() fold ".." as text, and realpathSync does too before it follows symlinks; the system and
// git follow a symlink first. So a path git reads is joined as plain text and resolved with realpathSync.native.
/** The system's real path of path, or null when nothing is there. Any other error is Unknown. */
function realOrNone(path) {
  try {
    return realpathSync.native(path);
  } catch (error) {
    if (GONE.has(error.code)) return null;
    throw unknown(path, error);
  }
}
function realOf(path) {
  const real = realOrNone(path);
  if (!real) throw unknown(path, "not there");
  return real;
}
function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch (error) {
    throw unknown(path, error);
  }
}
/** value read from a file in folder, as git joins it: unfolded. */
const from = (folder, value) => (isAbsolute(value) ? value : `${folder}${sep}${value}`);

/**
 * A one-line file git wrote (a .git file, commondir, a worktree's gitdir) without its line end, or null when there is
 * none. Git drops only the line end: a value with any other space at either end, an empty one, or an odd file is Unknown.
 */
function record(path) {
  if (!there(path)) return null;
  let text;
  try {
    const stat = statSync(path);
    if (!stat.isFile() || stat.size > 4096) throw new Error("not a small file");
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw unknown(path, error);
  }
  const value = text.replace(/[\r\n]+$/, "");
  if (!value || /^\s|\s$|[\r\n\0]/.test(value)) throw unknown(path, "a value git would read another way");
  return value;
}

/** The git folder of the checkout in the real folder top, as the system resolves it, or null when git finds none there. */
function gitDirOf(top) {
  const dot = join(top, ".git");
  if (!there(dot)) return null;
  const real = realOf(dot);
  if (isDir(real)) return real;
  const value = record(dot);
  // Git refuses a .git file without this line, or one naming nothing, and searches no further: no repo here then.
  if (!value.startsWith("gitdir: ")) return null;
  const named = value.slice("gitdir: ".length);
  if (named !== named.trim()) throw unknown(dot, "a value git would read another way");
  const git = realOrNone(from(top, named));
  return git && isDir(git) ? git : null;
}

/** The common git folder for a git folder: the one its commondir names, or itself. */
function commonOf(git) {
  const named = record(join(git, "commondir"));
  return named === null ? git : realOf(from(git, named));
}

/** The real folder that holds the first .git entry at or above the real folder start, or null. */
function topOf(start) {
  for (let at = start; ; at = dirname(at)) {
    if (there(join(at, ".git"))) return at;
    if (dirname(at) === at) return null;
  }
}

/**
 * The checkout each <common>/worktrees/<id>/gitdir names, when that folder's .git names the record's folder back.
 * A record whose folder is gone names nothing, and one that isn't named back can't drop a real tools folder from PATH.
 */
function recorded(common) {
  const list = join(common, "worktrees");
  if (!there(list)) return [];
  let ids;
  try {
    ids = readdirSync(list);
  } catch (error) {
    throw unknown(list, error);
  }
  return ids.flatMap((id) => {
    const admin = join(list, id);
    const named = record(join(admin, "gitdir"));
    const dot = named && realOrNone(from(admin, named));
    if (!dot) return [];
    const folder = dirname(dot);
    return gitDirOf(folder) === realOf(admin) ? [folder] : [];
  });
}

// Every checkout of a repository holds its committed files, and none is read before this one is (#182). So the repo
// is every checkout: this one, the main checkout that holds the common .git folder (its parent, even for a bare
// repository, whose bare flag is the repo's own config), and each linked worktree its records name.
/**
 * The repo's layout for dir: { tops, common }, tops as real paths with dir's own top folder (dir before `git init`)
 * first, and common the common git folder or null. Null when any part of it can't be read: then nothing counts as outside.
 */
export function repoLayout(dir) {
  try {
    const start = realOf(dir);
    const top = topOf(start);
    const git = top && gitDirOf(top);
    if (!git) return { tops: [top ?? start], common: null };
    const common = commonOf(git);
    return { tops: [...new Set([top, dirname(common), ...recorded(common)])], common };
  } catch (error) {
    if (error instanceof Unknown) return null;
    throw error;
  }
}

/** True when a folder at or above the real path real has a .git whose common folder is common: a checkout no record names. */
function checkoutAbove(real, common) {
  for (let at = real; ; at = dirname(at)) {
    const git = gitDirOf(at);
    if (git && commonOf(git) === common) return true;
    if (dirname(at) === at) return false;
  }
}

/** True when the real path real is inside the repo: in a top, on a mount of one, or in any checkout of its common folder. */
function within(real, { tops, common }) {
  const under = (top) => { const rel = relative(top, real); return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)); };
  if (tops.some(under)) return true;
  // A worktree moved with mv still works, but its record names the old path: a .git above the folder finds it.
  if (common && checkoutAbove(real, common)) return true;
  // A file system with no inode numbers reports 0 for every folder: then only the path counts.
  const ids = tops.map((top) => statSync(top, { bigint: true })).filter(({ ino }) => ino !== 0n).map(({ dev, ino }) => `${dev}:${ino}`);
  for (let at = real; ids.length; at = dirname(at)) {
    const { dev, ino } = statSync(at, { bigint: true });
    if (ids.includes(`${dev}:${ino}`)) return true;
    if (dirname(at) === at) return false;
  }
  return false;
}

/** True when the real path real is outside the repo. Anything unreadable counts as inside. */
function outsideReal(real, layout) {
  try {
    return !within(real, layout);
  } catch (error) {
    // A folder this process can't look into or above can't be shown to be outside the repo: left out.
    if (error instanceof Unknown || error.code) return false;
    throw error;
  }
}

/** The system's real path of an existing folder when it is outside the repo, else null. Anything unreadable counts as inside. */
function outsideOf(path, layout) {
  let real;
  try {
    real = realOrNone(path);
  } catch (error) {
    if (error instanceof Unknown) return null;
    throw error;
  }
  return real && outsideReal(real, layout) ? real : null;
}

// A PATH can name folders inside the repo, and the way preflight was started can add some (#182).
/**
 * The PATH for every probe before the read, as { [its key in env]: value }: the system's real path of each full-path
 * entry that exists outside every checkout of the repo, and none at all when the layout can't be read. The commands get
 * it too, so nothing they start comes from the repo, and they get the resolved paths, never the raw entries.
 * Why each folder another user could write was left off goes into dropped.
 */
export function pathOutside(dir, platform, env, layout = repoLayout(dir), dropped = []) {
  const split = platform === "win32" ? ";" : ":";
  // A folder another local user can write or swap is unsafe in the same way: they choose what runs from it (#232).
  const keep = (entry) => {
    const real = layout && isAbsolute(entry) ? outsideOf(entry, layout) : null;
    const why = real && othersCanWrite(real, { platform });
    if (why) dropped.push(why);
    return real && !why ? [real] : [];
  };
  const keys = Object.keys(env).filter((key) => key.toUpperCase() === "PATH");
  return Object.fromEntries(keys.map((key) => [key, String(env[key]).split(split).flatMap(keep).join(split)]));
}

// The session's TMPDIR can point into the repo, and git or npm run from a folder inside it read the repo's settings.
// Another local user who can write a temp folder, or swap it, could put hooks or a project's settings there (#232).
/** The session's temp folder, then the system's (not on Windows), then the home folder: where tempFolders looks. */
export const tempBases = (platform) => [tmpdir(), platform === "win32" ? null : "/tmp", homedir()];

/**
 * A new empty folder in base, only this user's, or null. The base's real path is checked first, so that no other user
 * can add, rename or replace an entry in it or swap a folder above it; the folder is made in that real path and its
 * path is used as made, never resolved again. So the folder checked is the folder used and removed (#232).
 */
function makeIn(base, platform) {
  let real, made;
  try {
    real = realpathSync.native(base);
    if (othersCanSwapIn(real, { platform })) return null;
    made = mkdtempSync(join(real, "onrails-preflight-"));
  } catch {
    // A folder that is gone, or that this sandbox can't read or write: the next one, or none.
    return null;
  }
  if (!notOwnFolder(made, { platform })) return made;
  // Not the plain folder mkdtemp makes: only that entry goes, and a symlink's target is never followed.
  rmSync(made, { recursive: true, force: true });
  return null;
}

/**
 * Empty temp folders for the probes, each one only this user can write and no one can swap. hooks: an empty hooks
 * folder, or null. away: how to run a command outside the repo, from such a folder whose real path is outside every
 * checkout of the repo, with a git that searches no folder above it; or null, also when the layout can't be read.
 * With none, the rows that need one wait for the read.
 */
export function tempFolders(dir, platform = process.platform, layout = repoLayout(dir), bases = tempBases(platform)) {
  let hooks = null, outside = null;
  for (const base of bases) {
    if ((hooks && (outside || !layout)) || !base) continue;
    const made = makeIn(base, platform);
    if (!made) continue;
    hooks ??= made;
    if (!outside && layout && outsideReal(made, layout)) outside = made;
    if (made !== hooks && made !== outside) rmSync(made, { recursive: true, force: true });
  }
  const away = outside && { cwd: outside, env: { GIT_CEILING_DIRECTORIES: dirname(outside) } };
  const remove = () => { for (const f of new Set([hooks, outside])) if (f) rmSync(f, { recursive: true, force: true }); };
  return { hooks, away, remove };
}
