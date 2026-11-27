// The folders on the way to a registry, for the process registry's store (procs-store.mjs, #231): whoever can write
// one of them can rename what is below it and put another folder in its place. On Windows the same comes from each
// folder's ACL, all read in one PowerShell start (#248). No dependencies.
// The master copy is scripts/procs-path.mjs in the kit; sync-skills.mjs copies it next to procs.mjs.
import { existsSync, lstatSync, readlinkSync } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";

const MAX_LINKS = 40; // as Linux's own limit: a loop of links ends here

// sys.lstat, when the machine has one, stands in for lstatSync, so a test can give a folder or a link another owner
// without root's chown.
const lstat = (sys, path) => (sys.lstat ?? lstatSync)(path);

/**
 * What a skip on the way to the home folder leaves: a repo can move, the home folder can't, so the home registry
 * and the index stay off while a repo's own registry still works (docs/decisions.md row 111).
 */
export const HOME_OFF = "the home registry and the index stay off, while a repo in folders only you can write still tracks its processes";

// Every folder whose entries are read on the way to dir, from the filesystem root down, following each symlink on
// the way (a link's own folder, then each folder of its target), then dir's real folder last. Real paths only.
// { path }, or { why } for a link another user owns: whoever owns a link in a sticky folder can still swap it.
// Throws when a part is missing, can't be read, or there are too many links.
function lookups(sys, dir, home) {
  const full = resolve(dir);
  let at = parse(full).root, rest = full.split(sep).filter(Boolean), links = 0;
  const seen = [];
  while (rest.length) {
    const name = rest.shift();
    if (name === ".") continue;
    if (name === "..") { at = dirname(at); continue; }
    seen.push(at);
    const next = join(at, name), s = lstat(sys, next);
    if (!s.isSymbolicLink()) { at = next; continue; }
    if (s.uid !== sys.uid && s.uid !== 0) {
      return { why: `${next}, on the way to ${dir}, is a symlink another user owns, so where it leads can't be trusted: ${home ? HOME_OFF : "open the repo by its real path"}` };
    }
    if (++links > MAX_LINKS) throw Object.assign(new Error(`too many symlinks on the way to ${dir}`), { code: "ELOOP" });
    const to = readlinkSync(next);
    rest = [...to.split(sep).filter(Boolean), ...rest];
    if (isAbsolute(to)) at = parse(to).root;
  }
  return { path: [...new Set([...seen, at])] };
}

// Linux file systems whose ACLs are POSIX ACLs, which getfacl and GNU ls show, so the mode's group bits bound what any
// ACL entry grants. Any other (nfs and nfs4, whose NFSv4 ACLs neither shows, cifs, fuse, 9p, vfat) can't be told.
const POSIX_ACL = new Set(["ext2", "ext3", "ext4", "xfs", "btrfs", "tmpfs", "f2fs", "jfs", "reiserfs", "zfs", "overlay"]);
// How WSL shows a Windows drive (/mnt/c): 9p on WSL 2, drvfs on WSL 1. To the person it is a local disk.
const WINDOWS_DRIVE = new Set(["9p", "drvfs"]);

// On Linux, why who can write dir can't be told from its mode and getfacl: its file system's ACLs don't show. Else
// null. The fix fits the folder: a repo moves (a copy is a new file, so its records start fresh, row 106); the home
// folder can't, so its registry and the index stay off.
function fsProblem(sys, dir, home) {
  if (sys.platform !== "linux") return null;
  const type = sys.fsType?.(dir);
  if (POSIX_ACL.has(type)) return null;
  const why = `${dir} is on ${type ? `a ${type}` : "an unknown"} file system, whose ACLs getfacl and ls don't show, so who else can write it can't be told`;
  if (home) return `${why}: the home registry and the index stay off on this machine, while a repo on a local Linux file system, such as ext4, still tracks its processes`;
  if (WINDOWS_DRIVE.has(type)) return `${why}: keep the repo inside the Linux file system, for example under ~, not on a Windows drive under /mnt; its records start fresh there`;
  return `${why}: move the repo onto a local Linux file system, such as ext4, xfs or btrfs; its records start fresh there`;
}

/**
 * Why the folder that holds .onrails (holder: a repo root, or the home folder when home) can't be trusted on Linux
 * or macOS, or null: a folder on the way to it, or the home folder itself, that another account can write, a link on
 * the way that another user owns, or a folder on a file system whose ACLs don't show (docs/decisions.md row 111).
 * The repo root's own rule is rootProblem's, in procs-store.mjs. group is procs-store.mjs's groupProblem, passed in
 * so the group rule stays in one place.
 */
export function pathProblem(sys, holder, home, group) {
  let walk;
  try { walk = lookups(sys, holder, home); } catch (error) { return `the folders on the way to ${holder} can't be read (${error.code})`; }
  if (walk.why) return walk.why;
  const real = walk.path.at(-1);
  for (const dir of walk.path) {
    const why = fsProblem(sys, dir, home) ?? (dir !== real ? aboveProblem(sys, dir, holder, group, home) : home ? homeProblem(sys, real, group) : null);
    if (why) return why;
  }
  return null;
}

// A folder above: root's or this user's, and no one else may write it, unless it is sticky (as /tmp is): then nobody
// else may rename or remove what is in it.
function aboveProblem(sys, dir, holder, group, home) {
  const s = lstat(sys, dir);
  if (s.uid !== sys.uid && s.uid !== 0) return `${dir}, above ${holder}, belongs to another user: ${home ? HOME_OFF : "use a repo in a folder only you can write"}`;
  if (s.mode & 0o1000) return null;
  if (s.mode & 0o002) return `others can write ${dir}, above ${holder}: run chmod o-w ${dir}`;
  return group(sys, s, dir, `the group can write ${dir}, above ${holder}`);
}

// The home folder holds ~/.onrails, as a repo root holds its .onrails: the same rule, in its own words.
function homeProblem(sys, home, group) {
  const s = lstat(sys, home);
  if (s.uid !== sys.uid) return `the home folder ${home} belongs to another user: ${HOME_OFF}`;
  if (s.mode & 0o002) return `others can write the home folder ${home}: run chmod o-w ${home}`;
  return group(sys, s, home, `the group can write the home folder ${home}`);
}

// Windows: each path's ACL once per command, read in batches by sys.winAcls, one PowerShell start each (#248).
const acls = new WeakMap();
/** Forgets the ACLs read so far, so the next check asks again. */
export const forgetAcls = (sys) => { if (sys.winAcls) acls.delete(sys.winAcls); };

/** Reads, in one PowerShell start, the ACL of each path that is there and wasn't read yet in this command. */
export function readAcls(sys, paths) {
  if (sys.platform !== "win32" || !sys.winAcls) return;
  const memo = acls.get(sys.winAcls) ?? new Map();
  acls.set(sys.winAcls, memo);
  const todo = [...new Set(paths)].filter((p) => !memo.has(p) && existsSync(p));
  if (!todo.length) return;
  const got = sys.winAcls(todo);
  for (const p of todo) memo.set(p, got?.get(p) ?? null);
}
const winAcl = (sys, path) => { readAcls(sys, [path]); return acls.get(sys.winAcls)?.get(path) ?? null; };

/** Every folder above dir, from the drive or filesystem root down. */
export function above(dir) {
  const up = [];
  for (let at = dirname(dir); !up.includes(at) && at !== dir; dir = at, at = dirname(at)) up.unshift(at);
  return up;
}

/**
 * On Windows, why path can't be trusted, or null: it must be owned by this user (or SYSTEM, Administrators or
 * TrustedInstaller), and no other account may write it. A folder made directly under C:\ lets every signed-in user
 * write, and what is made inside it inherits that (#174). The home folder (home) gets its own words: a repo can move,
 * the home folder can't.
 */
export function aclProblem(sys, path, home = false) {
  const acl = winAcl(sys, path), where = home ? `the home folder ${path}` : path, off = home ? `: ${HOME_OFF}` : "";
  if (!acl) return `who can write ${where} can't be read, so its owner can't be checked${off}`;
  if (!acl.owned) return `${where} belongs to another account${off}`;
  if (!acl.writers.length) return null;
  const fix = home ? "take their write access away, or the home registry and the index stay off" : "keep the repo in your user folder, or take their write access away";
  return `${where} can be written by other accounts (${acl.writers.join(", ")}): ${fix}`;
}

/**
 * On Windows, why a folder above a repo root can't be trusted, or null: #231's rule with the ACL. Owned as aclProblem
 * says, and no other account may rename, remove or replace what is in it. Making a new folder there is no swap, as in
 * a sticky folder: every signed-in user may make one under C:\ (#248).
 */
export function winAboveProblem(sys, root) {
  for (const dir of above(root)) {
    const acl = winAcl(sys, dir);
    if (!acl) return `who can change ${dir}, above ${root}, can't be read, so the folders on the way to the repo can't be checked`;
    if (!acl.owned) return `${dir}, above ${root}, belongs to another account: keep the repo in your user folder`;
    if (acl.movers.length) return `${dir}, above ${root}, can be changed by other accounts (${acl.movers.join(", ")}): keep the repo in your user folder`;
  }
  return null;
}
