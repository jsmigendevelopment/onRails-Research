// The Windows ACL reader of the process registry (procs.mjs): sys.winAcls(paths) in procs-sys.mjs. Every path a
// command needs goes to PowerShell in the environment, one per line, never on the command line, so no quoting can
// change the script, in as few starts as the environment's size allows (#248). No dependencies.
// The master copy is scripts/procs-winacl.mjs in the kit; sync-skills.mjs copies it next to procs.mjs.

// A Windows environment variable holds 32,767 characters at most, its name and the = included. Each start gets
// paths up to this many characters, so a long index costs one more start per chunk, never a start that fails (#248).
export const ACL_CHUNK = 30000;

/**
 * A Map of each path to { owned, writers, movers }: whether this user (or the admins) owns it, every other account
 * that can write it, and every other one that can rename, remove or replace what is in it; null for a path it can't
 * tell. A path with a line break can't go in the list, and one longer than a chunk can't fit, so neither can be told.
 * A block counts only when it ends, so output cut short, or a start that failed, leaves only the paths it didn't
 * finish as "can't tell". run(cmd, args, opts) is spawnSync or a test's fake.
 */
export function readWinAcls(run, paths) {
  const got = new Map();
  for (const list of chunks(paths.filter((p) => !/[\r\n]/.test(p) && p.length <= ACL_CHUNK))) {
    const r = run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WIN_ACL],
      { encoding: "utf8", timeout: 15000, windowsHide: true, env: { ...process.env, ONRAILS_ACL_PATH: list.join("\n") } });
    for (const [p, a] of winBatch(r?.stdout, list)) got.set(p, a);
  }
  return new Map(paths.map((p) => [p, got.get(p) ?? null]));
}

// The paths in order, in lists whose text, one per line, stays within ACL_CHUNK characters.
function chunks(paths) {
  const out = [];
  let list = [], size = 0;
  for (const p of paths) {
    if (list.length && size + 1 + p.length > ACL_CHUNK) {
      out.push(list);
      list = [];
    }
    size = list.length ? size + 1 + p.length : p.length;
    list.push(p);
  }
  return list.length ? [...out, list] : out;
}

// The ACL of each path in $env:ONRAILS_ACL_PATH, one per line: this user's SID once, then for path i "path i", the
// owner's SID, "nodacl" for a null DACL (everyone has full access), one line per rule, "<Allow|Deny> <SID> <rights>",
// and "end i"; or "fail i" when it can't be read. A rule that is inherit-only grants nothing on the path itself (as
// the one under C:\ that lets every user change what they make there); what inherits it is read with its own ACL.
// Single quotes only: the script goes through Windows' command-line quoting as one argument.
const WIN_ACL = ["$ErrorActionPreference = 'Stop'", "$t = [System.Security.Principal.SecurityIdentifier]",
  "'user ' + [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value", "$i = 0",
  "foreach ($p in ($env:ONRAILS_ACL_PATH -split [char]10)) { 'path ' + $i; try { $a = Get-Acl -LiteralPath $p; 'owner ' + $a.GetOwner($t).Value; "
  + "if ($a.GetSecurityDescriptorSddlForm('Access') -match 'NO_ACCESS_CONTROL') { 'nodacl' }; foreach ($r in $a.GetAccessRules($true, $true, $t)) { "
  + "if (-not ($r.PropagationFlags -band 2)) { '{0} {1} {2}' -f $r.AccessControlType, $r.IdentityReference.Value, [long]$r.FileSystemRights } }; "
  + "'end ' + $i } catch { 'fail ' + $i }; $i++ }"].join("; ");
// Any right that changes what is in it, who may, or that it is there: write or append data (make files or folders),
// write attributes, delete a child or itself, change its ACL or owner, and generic all or write.
const WIN_WRITE = 0x2 | 0x4 | 0x10 | 0x40 | 0x100 | 0x10000 | 0x40000 | 0x80000 | 0x10000000 | 0x40000000;
// What lets another account rename, remove or replace what is in a folder, or the folder itself: delete a child or
// itself, change its ACL or owner, and generic all. Making a new entry isn't one: it can't take a name that is there.
const WIN_MOVE = 0x40 | 0x10000 | 0x40000 | 0x80000 | 0x10000000;
// Accounts that may write besides this user: SYSTEM, Administrators, CREATOR OWNER and OWNER RIGHTS (they stand for
// the owner) and TrustedInstaller. They can already do anything on the machine. The owner may be this user, SYSTEM or
// Administrators, which an elevated session makes the owner of what it creates.
const WIN_TRUSTED = ["S-1-5-18", "S-1-5-32-544", "S-1-3-0", "S-1-3-4", "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464"];
const WIN_OWNERS = ["S-1-5-18", "S-1-5-32-544", WIN_TRUSTED[4]];
const SID = /^S-1(-\d+)+$/;

/**
 * One path's ACL from its PowerShell output: { owned, writers }, owned when this user, SYSTEM, Administrators or
 * TrustedInstaller owns the path, writers every other account an Allow rule gives a right in mask (a deny is ignored:
 * it can't take away another rule's grant to someone else). null for output it doesn't know, so the caller refuses.
 */
export function winAccess(text, mask = WIN_WRITE) {
  let user = null, owner = null;
  const writers = new Set();
  for (const line of (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const [word, sid, rights, ...more] = line.split(" ");
    if (line === "nodacl") writers.add("S-1-1-0");
    else if (more.length || !SID.test(sid ?? "")) return null;
    else if (word === "user" && rights === undefined) user = sid;
    else if (word === "owner" && rights === undefined) owner = sid;
    else if (!["Allow", "Deny"].includes(word) || !/^-?\d+$/.test(rights ?? "")) return null;
    else if (word === "Allow" && (Number(rights) >>> 0) & mask) writers.add(sid);
  }
  if (!user || !owner) return null;
  return { owned: [user, ...WIN_OWNERS].includes(owner), writers: [...writers].filter((s) => s !== user && !WIN_TRUSTED.includes(s)) };
}

/**
 * winAcls() from its PowerShell output for paths: a Map of each path whose block ended to { owned, writers, movers },
 * or null for a block it doesn't know. A path whose block is missing, failed or didn't end is left out.
 */
function winBatch(text, paths) {
  const lines = (text ?? "").split(/\r?\n/).map((l) => l.trim()), user = lines.find((l) => l.startsWith("user "));
  const got = new Map();
  let at = null, block = [];
  for (const line of user ? lines : []) {
    const [word, n, ...more] = line.split(" ");
    if (["path", "end", "fail"].includes(word) && !more.length && /^\d+$/.test(n ?? "")) {
      if (word === "end" && n === at && paths[Number(n)] !== undefined) got.set(paths[Number(n)], winRights([user, ...block].join("\n")));
      [at, block] = word === "path" ? [n, []] : [null, []];
    } else if (at !== null) block.push(line);
  }
  return got;
}

function winRights(text) {
  const write = winAccess(text), move = winAccess(text, WIN_MOVE);
  return write && move ? { ...write, movers: move.writers } : null;
}
