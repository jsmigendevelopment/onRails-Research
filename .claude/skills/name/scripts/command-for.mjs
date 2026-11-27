// How push-secrets.mjs and setup-github.mjs start gh and npx: by the full path on PATH, never a copy the repo ships
// (#237, #238). The rule of toolPath and launch in the CLI's system.mjs, which skill scripts can't import. The master
// is .agents/skills/secrets/scripts/command-for.mjs; scripts/sync-skills.mjs copies it next to setup-github.mjs.
import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, sep, win32 } from "node:path";

/** The nearest folder at or above start that holds .git, or null. */
export function repoRoot(start) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

// A folder's real path, or null when it doesn't exist (then it holds no tool).
function realDir(dir) {
  try {
    return realpathSync(dir);
  } catch {
    return null;
  }
}
// True when dir is root or inside it. Only a ".." path segment leaves root.
function within(dir, root) {
  const rel = relative(root, dir);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

// The folders whose tools never run, by real path: the repo's top folder and the current folder. A filesystem root
// never counts. A repo whose top folder is the home folder counts only when it is an onRails project, so a git repo
// at ~ doesn't make ~/.local/bin the repo's for a folder that isn't a git repo yet. A repo that holds a HOME set
// inside it (a sandbox) still counts (stricter than toolPath). The current folder always counts, even at ~: a run
// from the home folder never starts its tools.
function roots() {
  const home = realDir(homedir()) ?? homedir();
  const project = (dir) => [".onrails.json", ".ai-dev-workflow.json"].some((name) => existsSync(join(dir, name)));
  const top = realDir(repoRoot(process.cwd()) ?? process.cwd());
  const cwd = realDir(process.cwd());
  return [
    { dir: top && (top === cwd || top !== home || project(top)) ? top : null, label: "this repo" },
    { dir: cwd, label: "the current folder" },
  ].filter(({ dir }) => dir && dirname(dir) !== dir);
}

// npx puts the current folder's node_modules/.bin and each ancestor's first on PATH.
const BIN = /(^|[\\/])node_modules[\\/]\.bin[\\/]*$/i;

// Why a PATH entry that holds the tool is skipped, or null to use it. The .bin test runs on the real path too.
function skipped(entry, inside) {
  if (!isAbsolute(entry)) return "in a relative PATH entry";
  const dir = realDir(entry);
  if (BIN.test(entry) || BIN.test(dir)) return "in a node_modules/.bin";
  const root = inside.find((r) => within(dir, r.dir));
  return root ? `inside ${root.label}` : null;
}

// ComSpec or SystemRoot only as a full path with a drive letter or a UNC prefix: a bare or relative one is looked up
// from the current folder, and a drive-less \cmd.exe from the current drive.
const full = (path) => (path && /^([A-Za-z]:[\\/]|\\\\)/.test(path) ? path : null);

/**
 * How a command starts, with no shell: { file, args, env, verbatim } or { why }. The full path on PATH (PATHEXT on
 * Windows), never from a relative entry, a node_modules/.bin or a folder inside the repo, because Windows looks a bare
 * name up in the current folder first. A Windows .cmd shim starts only through cmd.exe, by its full path, with plain words.
 */
export function commandFor(cmd, cmdArgs, { platform = process.platform, env = process.env } = {}) {
  const win = platform === "win32";
  const inside = roots();
  const exts = win ? (env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter((ext) => /^\.(com|exe|bat|cmd)$/i.test(ext)) : [""];
  const isFile = (file) => existsSync(file) && statSync(file).isFile();
  let found = null;
  let why = null;
  for (const entry of (env.PATH || env.Path || "").split(win ? ";" : ":").filter(Boolean)) {
    const file = exts.map((ext) => join(entry, cmd + ext)).find(isFile);
    if (!file) continue;
    const skip = skipped(entry, inside);
    if (!skip) { found = file; break; }
    why ??= skip;
  }
  if (!found) return { why: why ? `${cmd} found only ${why}, not run` : `${cmd} isn't on your PATH` };
  if (!win) return { file: found, args: cmdArgs, env };
  // A .cmd shim starts a bare `node`: this stops cmd.exe, and what it starts, looking in the current folder first.
  const winEnv = { ...env, NoDefaultCurrentDirectoryInExePath: "1" };
  if (!/\.(cmd|bat)$/i.test(found)) return { file: found, args: cmdArgs, env: winEnv };
  if (!cmdArgs.every((arg) => /^[\w.:=/@$+,-]+$/.test(arg))) return { why: `only plain words go to cmd.exe, not: ${cmdArgs.join(" ")}` };
  // cmd.exe expands %NAME% even inside quotes. /s drops the line's outer quotes, so a path with a space stays one word.
  if (found.includes("%")) return { why: `cmd.exe would expand the % in ${found}` };
  const cmdExe = full(env.ComSpec) || win32.join(full(env.SystemRoot) || "C:\\Windows", "System32", "cmd.exe");
  // /v:off: a ! in the path is never expanded, even where the registry turns delayed expansion on.
  return { file: cmdExe, args: ["/d", "/v:off", "/s", "/c", `""${found}" ${cmdArgs.join(" ")}"`], env: winEnv, verbatim: true };
}
