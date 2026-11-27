// Who may write a folder preflight runs from or reads (#232, #246). On Linux and macOS the rule is the process registry's
// for a repo's root (procs-store.mjs, row 69): this user's or root's, no write bit for others, and the group's only when
// the group is this user's alone with no ACL. The sticky bit doesn't count for the folder itself: it stops renames, not new
// names, such as a .git, a package.json or a git another user puts there. It counts for a folder above: there it stops
// another user from swapping a folder this user or root owns for one of theirs. On Windows the rule reads the folder's ACL
// (#246), for every folder preflight needs, in one PowerShell start before the probes (loadWinAcls).
// The master copy is scripts/preflight-owner.mjs in the kit; sync-skills.mjs copies it next to each preflight.mjs.
import { spawnSync } from "node:child_process";
import { constants, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { realSys as machine } from "./procs-sys.mjs";
import { winAccess } from "./procs-winacl.mjs";
import { groupProblem } from "./procs-store.mjs";

let user;
const mine = () => (user ??= machine());

/** Why another local user could write the folder at path itself (s its lstat), or null. */
function writers(sys, path, s) {
  if (s.uid !== sys.uid && s.uid !== 0) return `${path} belongs to another user`;
  if (s.mode & 0o002) return `others can write ${path}`;
  return groupProblem(sys, s, path, `the group can write ${path}`);
}

/** Why another local user could swap child, the entry below the folder at (s its lstat), or null. */
function posixAbove(sys, at, s, child) {
  if (s.uid !== sys.uid && s.uid !== 0) return `${at} belongs to another user, who could swap ${child}`;
  const shared = writers(sys, at, s);
  return shared && !(s.mode & 0o1000) ? `${at} has no sticky bit to stop a swap of ${child}, and ${shared}` : null;
}

// SYSTEM, Administrators and TrustedInstaller, which owns System32, may own a folder: they can already do anything on the
// machine. The registry's winAccess takes the same three since #248 (row 114).
const WIN_OWNERS = ["S-1-5-18", "S-1-5-32-544", "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464"];
// On a folder above, only the rights that remove, rename or replace an entry, the folder itself, or who may: delete a
// child, delete, change the ACL or owner, generic all. Making a new entry there swaps nothing, as with the sticky bit,
// so C:\, where every signed-in account may make folders, passes as a folder above, and never as the folder itself.
const WIN_SWAP = 0x40 | 0x10000 | 0x40000 | 0x80000 | 0x10000000;
let acls = new Map();

/** Windows: why another account could write the folder at (or, given child, swap child in it), or null. */
function winRule(at, child) {
  const acl = acls.get(at);
  if (!acl) return `${at} can't be checked (its ACL wasn't read)`;
  // A rule that applies only to what is made inside a folder (C:\'s Modify for Authenticated Users) can't swap its child.
  const text = child ? acl.above.replace(/^Allow (\S+) (-?\d+)$/gm, (_, sid, r) => `Allow ${sid} ${(Number(r) >>> 0) & WIN_SWAP}`) : acl.text;
  const access = winAccess(text);
  if (!access) return `${at} can't be checked (an ACL preflight doesn't know)`;
  if (acl.owner !== acl.user && !WIN_OWNERS.includes(acl.owner)) return `${at} belongs to another account`;
  if (!access.writers.length) return null;
  return child ? `another account can rename or replace ${child} in ${at}` : `another account can write ${at}`;
}

/**
 * How each check runs, or { why } when it can't: look (lstat), own (the folder itself), above (a folder above child),
 * base (a folder something is made in) and made (a folder made in a base).
 */
function checker(platform, sys) {
  const look = sys.lstat ?? lstatSync;
  // A folder made in a base that passed holds only the rules it inherits from it, for this user and the trusted accounts.
  if (platform === "win32") return { look, own: (at) => winRule(at), above: (at, s, child) => winRule(at, child), base: (at) => winRule(at), made: () => null };
  if (!Number.isInteger(sys.uid)) return { why: "this user's id can't be read" };
  return {
    look, own: (at, s) => writers(sys, at, s), above: (at, s, child) => posixAbove(sys, at, s, child),
    base: (at, s) => posixAbove(sys, at, s, "a folder made in it"),
    made: (at, s) => (s.uid !== sys.uid ? `${at} belongs to another user` : writers(sys, at, s)),
  };
}

const isLink = (s) => (s.mode & constants.S_IFMT) === constants.S_IFLNK;
const unchecked = (path, error) => `${path} can't be checked (${error.code ?? "an error"})`;

/**
 * Why another local user could add, rename or replace an entry in the folder at, or in a folder above it, or null.
 * child names the entry below at. The folders are looked at with lstat, so a symlink on the way counts as unsafe:
 * when this passes, the path checked is the path the system follows, and nobody else can change it.
 */
function swaps(how, at, child) {
  for (; ; child = at, at = dirname(at)) {
    const s = how.look(at);
    if (isLink(s)) return `${at} is a symlink, which could be pointed somewhere else`;
    const why = how.above(at, s, child);
    if (why) return why;
    if (dirname(at) === at) return null;
  }
}

/**
 * Why another local user could write the folder at path, or swap it or a folder above it, or null when only this user
 * (or root) can. A folder that can't be checked counts as written by others. sys gives uid, gid, acl and privateGroup,
 * and a test's sys may give lstat in place of the real one. On Windows, call loadWinAcls first: every check reads the ACLs
 * it last loaded, and a folder it didn't load can't be checked.
 */
export function othersCanWrite(path, { platform = process.platform, sys = mine() } = {}) {
  const how = checker(platform, sys);
  if (how.why) return how.why;
  try {
    const real = realpathSync.native(path);
    // Each folder above is checked as one that holds the folder below it, so this user or root owns each of them.
    return how.own(real, how.look(real)) ?? (dirname(real) === real ? null : swaps(how, dirname(real), real));
  } catch (error) {
    return unchecked(path, error);
  }
}

/**
 * Why another local user could add, rename or replace an entry in the real folder at path, or swap a folder above it,
 * or null. A folder this user makes in it then stays the one this user made (#232). The sticky bit counts here, for
 * the folder itself too; on Windows the folder itself must be only this user's, since what is made in it inherits its
 * rules. path is never resolved: a symlink on it counts as unsafe.
 */
export function othersCanSwapIn(path, { platform = process.platform, sys = mine() } = {}) {
  const how = checker(platform, sys);
  if (how.why) return how.why;
  if (!isAbsolute(path)) return `${path} isn't a full path`;
  try {
    const s = how.look(path);
    if (isLink(s)) return `${path} is a symlink, which could be pointed somewhere else`;
    return how.base(path, s) ?? (dirname(path) === path ? null : swaps(how, dirname(path), path));
  } catch (error) {
    return unchecked(path, error);
  }
}

/** Why the entry at path isn't a plain folder this user owns and only this user can write (path not followed), or null. */
export function notOwnFolder(path, { platform = process.platform, sys = mine() } = {}) {
  const how = checker(platform, sys);
  if (how.why) return how.why;
  try {
    const s = how.look(path);
    if ((s.mode & constants.S_IFMT) !== constants.S_IFDIR) return `${path} isn't a plain folder`;
    return how.made(path, s);
  } catch (error) {
    return unchecked(path, error);
  }
}

// Every folder's ACL in one start, the path in base64 on stdin so no quoting or code page can change it: "user <SID>",
// then for each path "path <index>" and the lines winAccess reads ("owner <SID>", "nodacl", rules), or "error". A rule
// that applies only to what is made inside the folder (inherit-only) ends in " io".
const WIN_ACLS = ["$ErrorActionPreference = 'Stop'", "$t = [System.Security.Principal.SecurityIdentifier]",
  "'user ' + [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value", "$i = 0",
  "foreach ($l in [Console]::In.ReadToEnd().Split([char]10)) { 'path ' + $i; $i++; try { "
  + "$a = Get-Acl -LiteralPath ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($l.Trim()))); 'owner ' + $a.GetOwner($t).Value; "
  + "if ($a.GetSecurityDescriptorSddlForm('Access') -match 'NO_ACCESS_CONTROL') { 'nodacl' }; "
  + "foreach ($r in $a.GetAccessRules($true, $true, $t)) { $io = if ([int]$r.PropagationFlags -band 2) { ' io' } else { '' }; "
  + "'{0} {1} {2}{3}' -f $r.AccessControlType, $r.IdentityReference.Value, [long]$r.FileSystemRights, $io } "
  + "} catch { 'error' } }"].join("; ");

/** PowerShell's answer for paths, by its full path from System32 so no copy in the repo runs, or null. */
function powershell(paths) {
  const system = join(process.env.SystemRoot || "C:\\Windows", "System32");
  const r = spawnSync(join(system, "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", WIN_ACLS],
    { cwd: system, input: paths.map((p) => Buffer.from(p).toString("base64")).join("\n"), encoding: "utf8", timeout: 30000, windowsHide: true });
  return r.error || r.status !== 0 ? null : r.stdout;
}

// An inherit-only rule: kept, without its mark, for the folder itself and a temp base, as what is made there gets it.
const INHERIT_ONLY = /^((?:Allow|Deny) \S+ -?\d+) io$/;

/**
 * path -> { user, owner, text, above } from the batch's output, where above leaves out the inherit-only rules, for the
 * folder as one above. A path with an error, or any odd output, is left out.
 */
function parseAcls(paths, out) {
  const map = new Map();
  const lines = (out ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const me = /^user (S-1(-\d+)+)$/.exec(lines[0] ?? "")?.[1];
  let at, section = [];
  const close = () => {
    const owner = section.find((l) => l.startsWith("owner "))?.slice(6);
    if (paths[at] === undefined || !owner || section.includes("error")) return;
    const text = [`user ${me}`, ...section.map((l) => INHERIT_ONLY.exec(l)?.[1] ?? l)].join("\n");
    map.set(paths[at], { user: me, owner, text, above: [`user ${me}`, ...section.filter((l) => !INHERIT_ONLY.test(l))].join("\n") });
  };
  for (const line of me ? lines.slice(1) : []) {
    const index = /^path (\d+)$/.exec(line)?.[1];
    if (index === undefined) section.push(line);
    else {
      close();
      at = Number(index);
      section = [];
    }
  }
  close();
  return map;
}

/** Reads the ACL of every folder in paths in one PowerShell start (#246), for the Windows checks after it. run: for tests. */
export function loadWinAcls(paths, run = powershell) {
  const list = [...new Set(paths)];
  acls = parseAcls(list, list.length ? run(list) : null);
}

/** p and every folder above it. */
function ancestors(p) {
  const out = [];
  for (let at = p; ; at = dirname(at)) {
    out.push(at);
    if (dirname(at) === at) return out;
  }
}

/** The git folder each .git at or above start names, for the read mark's check. */
function gitFolders(start) {
  return ancestors(start).flatMap((at) => {
    const dot = join(at, ".git");
    try {
      const s = statSync(dot);
      if (s.isDirectory()) return [dot];
      const named = s.isFile() && s.size < 4096 && /^gitdir: (.+)$/m.exec(readFileSync(dot, "utf8"))?.[1]?.trim();
      return named ? [resolve(at, named)] : [];
    } catch {
      // No .git here, or one that can't be read: nothing to ask about.
      return [];
    }
  });
}

/** Every folder the Windows checks may ask about for dir: its own, its git folders', PATH's and the temp bases', and all above. */
export function aclPaths(dir, env, bases) {
  const real = (p) => {
    try {
      return realpathSync.native(p);
    } catch {
      // A folder that is gone: no check will ask about it.
      return null;
    }
  };
  const start = real(dir);
  const path = Object.keys(env).filter((k) => k.toUpperCase() === "PATH").flatMap((k) => String(env[k]).split(";")).filter((p) => p && isAbsolute(p));
  const named = [...(start ? [start, ...gitFolders(start)] : []), ...path, ...bases.filter(Boolean)].map(real).filter(Boolean);
  return [...new Set(named.flatMap(ancestors))];
}
