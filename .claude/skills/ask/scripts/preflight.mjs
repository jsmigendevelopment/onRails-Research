#!/usr/bin/env node
// Preflight (#100): probes the agent's own session in about 10 seconds and prints ONE table,
// so every sandbox blocker is found in the first minute. `doctor` runs in the person's terminal,
// which has other permissions, and can't see these. Each failure comes with its fix ladder:
// work around it in the sandbox, ask to run one command outside it, use the environment tools,
// and only then the person, in ONE message. The ask skill's references/preflight.md has the steps.
//   node preflight.mjs [dir] [--record] [--if-changed] [--json] [--mark-read]
//                      [--model <id>] [--effort <level>] [--tool claude|claude-cloud|codex|other]
// --record writes the result to the Environment line of docs/state.md. --if-changed skips every
// probe when that line says ok and the sandbox hasn't changed. --mark-read is for /join and /back:
// it marks the repo read on this machine (#169), and preflight runs no code the repo chose until then.
// It changes nothing else: a temp file, a temp branch (or a temp git config key), a temp folder
// outside the repo and a local port are made and removed.
// Exit 0: nothing to fix. 1: something to fix or blocked. 2: a bad flag. No dependencies.
// The master copy is scripts/preflight.mjs in the kit, with preflight-sys.mjs, preflight-owner.mjs, preflight-layout.mjs and
// preflight-ci.mjs; sync-skills.mjs copies all five into the ask skill and the CLI. Before the read, never start it through npx (#182): npx changes PATH
// and which onrails runs, in ways the repo can steer.
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ciWarnings } from "./preflight-ci.mjs";
import { pathOutside, repoLayout, tempBases, tempFolders } from "./preflight-layout.mjs";
import { aclPaths, loadWinAcls } from "./preflight-owner.mjs";
import { isRead, markRead, markRefusal, realSys } from "./preflight-sys.mjs";

/** The checks, in the order the table prints them. */
export const CHECKS = ["repo", "git", "registry", "github", "loopback", "browser", "versions", "model"];
const LABELS = { repo: "Write the repo", git: "Write .git", registry: "Package registry", github: "GitHub", loopback: "Loopback",
  browser: "A browser", versions: "Node and package manager", model: "Model and effort" };
const MARK = { ok: "✓", fix: "✗", blocked: "✗", limited: "–", skip: "–", info: "–" };
const TOOLS = { claude: "Claude Code", "claude-cloud": "Claude Code (cloud session)", codex: "Codex", other: "an unknown tool" };
// Launches the project's own Playwright Chromium and closes it. Run with node -e in the project.
const LAUNCH = "const r=require('module').createRequire(process.cwd()+'/package.json');let p;try{p=r('playwright')}catch{p=r('@playwright/test')}"
  + "p.chromium.launch({headless:true}).then(b=>b.close()).then(()=>console.log('ok')).catch(e=>{console.error(String(e.message).split('\\n')[0]);process.exit(1)})";

// The table, the ladder and the drafted message are read by the agent, and the message is posted. So a value
// from the repo or the environment is printed only when it matches a safe pattern, and plain words stand in for it otherwise.
const SAFE = { range: /^[\d.xX*^~<>= |]{1,40}$/, host: /^[a-z0-9.-]{1,253}(:\d{1,5})?$/i, version: /^\d+(\.\d+){0,2}(-[0-9A-Za-z.-]{1,40})?$/,
  code: /^E[A-Z0-9_]{2,30}$/, model: /^[\w.:@\/[\]-]{1,80}$/, effort: /^[a-z]{1,12}$/i, flag: /^--?[a-z][\w-]{0,30}$/i,
  path: /^[\w .:~@+\/\\-]{1,400}$/, reason: /^[\w .,:'~@+()\/\\-]{1,600}$/ };
const shown = (value, kind, instead) => (value != null && SAFE[kind].test(String(value)) ? String(value) : instead);
// Command output can carry text from the repo too, so only a cause from this list, or an error code, is taken from it.
const CAUSES = ["Read-only file system", "Permission denied", "Operation not permitted", "No space left on device", "Executable doesn't exist",
  "Host system is missing dependencies", "not a git repository", "dubious ownership"];
const cause = (out = "", instead = "an error preflight doesn't print") =>
  CAUSES.find((c) => out.toLowerCase().includes(c.toLowerCase())) ?? shown(/\b(E[A-Z_]{4,30}|E\d{3})\b/.exec(out)?.[1], "code", instead);

/** Which tool this session runs in, from what it sets in the environment. --tool overrides a wrong guess. */
export function detectTool(env = {}) {
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT) return env.CLAUDE_CODE_REMOTE === "true" ? "claude-cloud" : "claude";
  if (Object.keys(env).some((k) => k.startsWith("CODEX_"))) return "codex";
  return "other";
}

/** True when a version fits a simple range (>=22, ^22, 22.x, "22.x || >= 24"). Range syntax it can't read never blocks. */
export function satisfies(version, range) {
  const v = String(version).split(".").map(Number);
  const cmp = (want) => { for (let i = 0; i < 3; i++) { const d = (v[i] ?? 0) - (want[i] ?? 0); if (d) return d; } return 0; };
  const one = (token) => {
    const m = /^(>=|>|<=|<|\^|~|=)?v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/.exec(token);
    if (!m) return null;
    const num = (s) => (s === undefined || s === "x" || s === "*" ? undefined : Number(s));
    const [op, b, c] = [m[1] ?? "", num(m[3]), num(m[4])];
    const want = [Number(m[2]), b ?? 0, c ?? 0];
    if (op === ">=") return cmp(want) >= 0;
    if (op === ">") return cmp(want) > 0;
    if (op === "<=") return cmp(want) <= 0;
    if (op === "<") return cmp(want) < 0;
    if (op === "^") return v[0] === want[0] && cmp(want) >= 0;
    if (op === "~") return v[0] === want[0] && (b === undefined || v[1] === b) && cmp(want) >= 0;
    return v[0] === want[0] && (b === undefined || v[1] === b) && (c === undefined || v[2] === c);
  };
  // A whole token that is a version: an optional operator, v?, then one to three parts of digits, x or *, or three
  // parts and a prerelease, as semver allows it (18.x.x-rc too). A hyphen range's "-" counts only as the middle of three tokens.
  const versionish = (token, i, tokens) => /^(>=|>|<=|<|\^|~|=)?v?((\d+|[xX*])(\.(\d+|[xX*])){0,2}|(\d+|[xX*])(\.(\d+|[xX*])){2}-[0-9A-Za-z.-]+)$/.test(token)
    || (token === "-" && i === 1 && tokens.length === 3);
  const parts = String(range).split("||").map((part) => part.trim().replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1").split(" ").filter(Boolean))
    .filter((tokens) => tokens.length && tokens.every(versionish)).map((tokens) => tokens.map(one));
  // A part that isn't a version range at all (junk characters, or words such as "latest") was dropped above, so
  // the other parts decide. Version syntax this small reader can't follow (a hyphen range, a prerelease) may
  // still fit Node, so it never blocks. Nor does a range with nothing left.
  if (!parts.length || parts.some((results) => results.includes(null))) return true;
  return parts.some((results) => results.every(Boolean));
}

// Rung 2: the tool's own way to run one command outside the sandbox.
const ONE_COMMAND = {
  codex: (cmd) => `Ask to run \`${cmd}\` outside the sandbox (\`approval_policy = "on-request"\`): the person approves that one command.`,
  claude: (cmd) => `Run \`${cmd}\` as one plain command, so a permission prompt covers only it.`,
  "claude-cloud": () => "A cloud session has no prompt that lifts this. Go to rung 3.",
  other: (cmd) => `If your tool can ask to run one command outside its sandbox, ask for \`${cmd}\`.`,
};
// Rung 3: the environment tools the session may use.
const ENV_TOOLS = {
  codex: "Check that `.codex/config.toml` loaded: the project must be trusted. It sets `network_access = true`.",
  claude: "Check the sandbox and permission settings you may change, such as `.claude/settings.json`.",
  "claude-cloud": "Use the session's environment tools: read its network and setup pages (`read_documentation`), then propose the change to the environment.",
  other: "Use any environment or setup tool your session has.",
};
const CODEX_TRUST = "Trust this project so `.codex/config.toml` loads (it sets `network_access = true`), then restart Codex.";

// Rung 1's project-local cache, in each manager's own words. yarn 2+ has no --prefer-offline, and yarn and bun have no --cache.
// yarn 1 reads YARN_CACHE_FOLDER and ignores the other variables. yarn 4 keeps its global cache on by default and then
// ignores YARN_CACHE_FOLDER, so the global cache is turned off too. Even then yarn 4 writes its mirror, metadata and
// install index under its global folder in the home folder, so that folder moves into the project as well.
const CACHE = { npm: "`npm install --prefer-offline --cache .npm-cache`", pnpm: "`pnpm install --prefer-offline --store-dir .pnpm-store`",
  yarn: "`YARN_GLOBAL_FOLDER=.yarn-global YARN_ENABLE_GLOBAL_CACHE=false YARN_CACHE_FOLDER=.yarn-cache yarn install`"
    + " (yarn 1 reads the cache folder; yarn 2+ also needs its global folder in the project and its global cache off)",
  bun: "`bun install --cache-dir .bun-cache`" };
// A bare VAR=value prefix works only in a POSIX shell (Git Bash too), so Windows also gets the PowerShell and cmd.exe forms.
const YARN_CACHE_WINDOWS = " In PowerShell: `$env:YARN_GLOBAL_FOLDER='.yarn-global'; $env:YARN_ENABLE_GLOBAL_CACHE='false';"
  + " $env:YARN_CACHE_FOLDER='.yarn-cache'; yarn install`. In cmd.exe: `set \"YARN_GLOBAL_FOLDER=.yarn-global\" &&"
  + ' set "YARN_ENABLE_GLOBAL_CACHE=false" && set "YARN_CACHE_FOLDER=.yarn-cache" && yarn install`.';

/** The four rungs for a blocked check: 1 workarounds, 2 one command outside the sandbox, 3 environment tools, 4 the person. */
function ladder(id, tool, { host = "the registry", pm = "npm", want = "", platform } = {}) {
  const install = `${pm} install`;
  const cache = CACHE[pm] + (pm === "yarn" && platform === "win32" ? YARN_CACHE_WINDOWS : "");
  const by = {
    repo: ["Work in a folder you can write: a temp folder, or a fresh clone under your home folder.", "touch a file here",
      { any: "Make this folder writable for the agent, or open the session in a folder that is." }],
    git: ["`git init` in a writable place and commit there (`git init --separate-git-dir <a writable folder>`), or keep working and commit at the end.",
      "git commit", { any: "Run the git command in your own terminal in this folder, or let the agent's git run outside the sandbox when it asks." }],
    registry: [`A project-local cache: ${cache}. Check \`.npmrc\` names the registry you mean.`, install, {
      codex: CODEX_TRUST, claude: `Allow network access to ${host} for this project, or run \`${install}\` in your own terminal in this folder.`,
      "claude-cloud": `Allow ${host} in the cloud environment's network settings.`,
      other: `Give the agent's sandbox network access to ${host}, or run \`${install}\` in your own terminal in this folder.` }],
    loopback: ["Try another port. Run the server and the tests in the same process (no listening port). Next.js: `--webpack` in place of Turbopack.",
      "the dev server and its tests", { codex: CODEX_TRUST, any: "Let the agent's sandbox listen on 127.0.0.1, or run the browser checks in your own terminal." }],
    versions: ["A version manager already on this machine: `nvm use`, `fnm use` or `volta`, if one is installed.", "nvm install",
      { any: `Install a Node that fits ${want || ">=22"} (https://nodejs.org), then start the agent again in this folder.` }],
  }[id];
  if (!by) return [];
  const [workaround, command, person] = by;
  return [
    { rung: 1, text: `In the sandbox: ${workaround}` },
    { rung: 2, text: `One command outside it: ${ONE_COMMAND[tool](command)}` },
    { rung: 3, text: `Environment tools: ${ENV_TOOLS[tool]}` },
    { rung: 4, text: `The person, last: ${person[tool] ?? person.any}` },
  ];
}
const selfFix = (text) => [{ rung: 1, text: `Fix it yourself: ${text}` }];

function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}
const firstLine = (text = "") => text.split("\n").find((l) => l.trim())?.trim().slice(0, 140) ?? "";
// Only a small regular file is read: a symlink to a device, or a huge file, could stall preflight.
const small = (path) => (existsSync(path) && statSync(path).isFile() && statSync(path).size < 65536 ? readFileSync(path, "utf8") : "");

function checkRepo(dir, tool) {
  const file = join(dir, `.onrails-preflight-${randomBytes(4).toString("hex")}`);
  try {
    writeFileSync(file, "x");
    rmSync(file);
    return { status: "ok", detail: "wrote and removed a temp file" };
  } catch (error) {
    return { status: "blocked", detail: `can't write here: ${shown(error.code, "code", "an error")}`, ladder: ladder("repo", tool) };
  }
}

// Until the person's own session has marked the repo read (#169), no probe runs code the repo chose. `safe` holds:
// read; outside, an empty temp folder outside the repo; and git, the settings that keep the repo's hooks from running.
// closed: the repo's layout can't be read, so no PATH folder is kept and no command runs before the read (#182).
const CLOSED = "the repo's checkouts can't all be read, so no PATH folder is used yet: checked after the repo is read";

async function checkGit(dir, tool, sys, safe) {
  if (safe.closed) return { status: "limited", detail: CLOSED };
  if (!safe.hooks) return { status: "limited", detail: "no empty hooks folder that only this user can write could be made, so it's checked after the repo is read" };
  const git = (args) => sys.run("git", args, { cwd: dir, ...safe.git });
  const top = await git(["rev-parse", "--show-toplevel"]);
  if (!top) return { status: "blocked", detail: "git isn't installed", ladder: ladder("git", tool) };
  if (!top.ok && existsSync(join(dir, ".git"))) {
    return { status: "fix", detail: `a .git is here, but git can't read it: ${cause(top.out, "git's error isn't printed")}`,
      ladder: selfFix("run `git status` and fix what it says (a `.git` file that points nowhere, or `safe.directory` for dubious ownership), then run preflight again.") };
  }
  if (!top.ok) return { status: "fix", detail: "no git repo here yet", ladder: selfFix("`git init`, then run preflight again.") };
  const name = `onrails-preflight-${randomBytes(4).toString("hex")}`;
  // A temp branch proves refs can be written. A repo with no commit yet has nothing to branch from, so a temp config key stands in.
  const hasCommit = (await git(["rev-parse", "--verify", "HEAD"]))?.ok;
  const made = await git(hasCommit ? ["branch", name] : ["config", "--local", "onrails.preflight", name]);
  if (!made?.ok) return { status: "blocked", detail: `can't write .git: ${cause(made?.out, "git refused")}`, ladder: ladder("git", tool) };
  await git(hasCommit ? ["branch", "-D", name] : ["config", "--local", "--unset", "onrails.preflight"]);
  return { status: "ok", detail: hasCommit ? "made and deleted a temp branch" : "wrote and removed a temp config key (no commit yet)" };
}

// Before the read, npm runs from the folder outside the repo, so no packageManager pin or .npmrc of the repo's is in
// scope. The registry the repo's .npmrc names is passed by hand, only when it is a plain URL.
const PLAIN_REGISTRY = /^registry[ \t]*=[ \t]*(https?:\/\/[\w.-]+(:\d{1,5})?(\/[\w./-]*)?)[ \t]*$/m;

// Said by the rows that run from outside the repo, when no temp folder outside it could be made.
const NO_AWAY = "no empty temp folder outside the repo that only this user can write could be made, so it's checked after the repo is read";

async function checkRegistry(dir, tool, sys, pm, safe) {
  if (safe.closed) return { status: "limited", detail: CLOSED };
  const named = safe.read ? null : PLAIN_REGISTRY.exec(small(join(dir, ".npmrc")))?.[1];
  const how = safe.read ? { cwd: dir } : safe.away;
  if (!how) return { status: "limited", detail: NO_AWAY };
  // Global mode reads no project .npmrc: one another user put in a shared folder above, such as /tmp, would name its
  // registry and settings (#232). Unlike --prefix=., it leaves npm's own global npmrc where npm puts it, and passes no path.
  const pick = [...(safe.read ? [] : ["--location=global"]), ...(named ? [`--registry=${named}`] : [])];
  const url = await sys.run("npm", ["config", "get", "registry", ...pick], how);
  if (!url) return { status: "blocked", detail: "npm isn't installed", ladder: ladder("versions", tool) };
  // Node before 18.17 has no URL.canParse: then plain words, and the versions row says Node is too old.
  const raw = url.out.trim();
  const host = shown(URL.canParse?.(raw) ? new URL(raw).host : null, "host", "the registry in .npmrc");
  // The metadata of one package, fresh from the registry the project's .npmrc names. npm honours the session's proxy.
  const meta = await sys.run("npm", ["view", "npm", "dist-tags.latest", "--prefer-online", "--fetch-retries=0", "--fetch-timeout=10000", ...pick], { ...how, timeout: 30000 });
  if (meta?.ok) return { status: "ok", detail: `${host} answered` };
  const code = cause(meta?.out, "no answer");
  return { status: "blocked", detail: `${host} didn't answer (${code})`, ladder: ladder("registry", tool, { host, pm, platform: sys.platform }) };
}

// Before the read, git ls-remote runs from outside the repo against the remote's URL, so no setting in the repo's
// .git/config (an upload-pack, an ssh command, a protocol) is read. Only a URL in a plain https or ssh form is used,
// and an https one with no user or token in it, so no secret is put on a command line.
const PLAIN_REMOTE = /^(https?:\/\/[^\s@-][^\s@]*|ssh:\/\/([\w.-]+@)?[A-Za-z0-9][\w.-]*(:\d{1,5})?\/\S+|[\w.-]+@[A-Za-z0-9][\w.-]*:[^\s-]\S*)$/;

async function checkGithub(dir, sys, safe) {
  if (safe.closed) return { status: "limited", detail: CLOSED };
  const remote = await sys.run("git", ["remote", "get-url", "origin"], { cwd: dir, ...safe.git });
  const url = remote?.ok ? remote.out.trim().split("\n")[0] : "";
  const away = safe.read ? { cwd: dir } : safe.away;
  if (!away) return { status: "limited", detail: NO_AWAY };
  // `gh api rate_limit` is free and proves the API answers. `gh auth status` can fail while the API works (a proxied token).
  const api = await sys.run("gh", ["api", "rate_limit"], away);
  const plain = safe.read || PLAIN_REMOTE.test(url);
  const push = url && plain ? await sys.run("git", ["ls-remote", "--heads", safe.read ? "origin" : url], { ...away, timeout: 20000 }) : null;
  if (api?.ok && (!url || push?.ok)) return { status: "ok", detail: url ? "the remote and the API answer" : "the API answers; no remote yet" };
  const why = !api ? "gh isn't installed" : !api.ok ? "gh isn't signed in, or the API is limited"
    : plain ? "the remote didn't answer" : "the remote's URL isn't a plain https or ssh one, so it's checked after the repo is read";
  const mode = url && push?.ok ? "pushes work, so the loop queues the API steps (local mode)" : "the loop runs in local mode, with issues as files";
  return { status: "limited", detail: `${why}: ${mode}. \`gh auth login\` is the person's step, when they want GitHub` };
}

async function checkBrowser(dir, tool, sys, pkg, pm, safe) {
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const name = ["@playwright/test", "playwright"].find((n) => deps[n]);
  if (!name) return { status: "skip", detail: "not needed yet: no Playwright in package.json" };
  if (!existsSync(join(dir, "node_modules", ...name.split("/")))) return { status: "skip", detail: "Playwright isn't installed yet: run preflight again after the install" };
  // The launch loads the project's own Playwright, from files the repo can ship.
  if (!safe.read) return { status: "limited", detail: "Playwright is installed; its launch check loads the project's own files, so it runs after the repo is read" };
  const launch = await sys.run("node", ["-e", LAUNCH], { cwd: dir, timeout: 40000 });
  if (launch?.ok) return { status: "ok", detail: "headless Chromium started and closed" };
  return { status: "fix", detail: `Chromium didn't start: ${cause(launch?.out)}`,
    ladder: selfFix(`\`${pm} exec playwright install chromium\` (Playwright's bundled browser), then run preflight again. Still failing? Treat it as blocked: the download needs the network.`) };
}

// package.json comes from the repo, so its packageManager is never a command by itself.
const MANAGERS = ["npm", "pnpm", "yarn", "bun"];
// With no usable packageManager, the lockfile names the manager, so a yarn project is never told to run npm.
const LOCKS = { "pnpm-lock.yaml": "pnpm", "yarn.lock": "yarn", "bun.lock": "bun", "bun.lockb": "bun" };

/** packageManager as { name, version }: null when unset, { name: null } unless it's a known manager with a plain or prerelease version. */
function readManager(pkg) {
  const field = pkg?.packageManager;
  if (field === undefined || field === null || field === "") return null;
  const [name, version, ...rest] = String(field).split("+")[0].split("@");
  const known = MANAGERS.includes(name) && (version === undefined || SAFE.version.test(version)) && !rest.length;
  return known ? { name, version } : { name: null };
}

// The release's version, from its file name, when the folder's own config names it in the plain form. Shown, never run.
function ownYarnVersion(dir) {
  const rc = [[".yarnrc.yml", /^yarnPath:[ \t]*["']?([^"'\n#]+)/m], [".yarnrc", /^yarn-path[ \t]+["']?([^"'\n#]+)/m]]
    .map(([file, re]) => re.exec(small(join(dir, file)))?.[1]).find(Boolean);
  return rc ? shown(/yarn-([^/\\]+?)\.c?js\s*$/.exec(rc)?.[1], "version", null) : null;
}

// Until the repo has been read (/join or /back marks it), preflight runs no `<pm> --version`: a package manager can
// load files the repo ships, or a release the repo names, on any command, from more places than preflight could list.
// So it is only looked up on PATH, and a yarn release the folder's own config names gives its version by its file name.
/** The manager's version: { version, unread }. unread marks a manager found on PATH but not run, as the repo isn't read yet. */
async function managerVersion(dir, sys, pm, safe) {
  if (!safe.read) {
    if (!sys.has(pm, safe.path)) return { version: null };
    return { version: pm === "yarn" ? ownYarnVersion(dir) : null, unread: true };
  }
  const have = await sys.run(pm, ["--version"], { cwd: dir });
  return { version: have?.ok ? shown(firstLine(have.out), "version", "(version not shown)") : null };
}

async function checkVersions(dir, tool, sys, pkg, manager, safe) {
  const range = pkg?.engines?.node ?? ">=22";
  const want = shown(range, "range", "the range in package.json's engines.node");
  const who = pkg?.engines?.node ? "the project" : "the kit";
  const node = shown(sys.node, "version", "(version not shown)");
  if (!satisfies(sys.node, range)) return { status: "blocked", detail: `Node ${node}, ${who} needs ${want}`, ladder: ladder("versions", tool, { want }) };
  if (!manager) return { status: "ok", detail: `Node ${node} (needs ${want})` };
  if (!manager.name) {
    return { status: "limited", detail: `Node ${node} (needs ${want}); unrecognised packageManager in package.json, so none ran. `
      + "Preflight runs only npm, pnpm, yarn or bun, with a plain or prerelease version" };
  }
  if (safe.closed) return { status: "limited", detail: `Node ${node} (needs ${want}); ${manager.name}: ${CLOSED}` };
  const { name: pm, version: pin } = manager;
  const { version, unread } = await managerVersion(dir, sys, pm, safe);
  // A prerelease pin (4.0.0-rc.42) keeps the name and its probe. Only a plain pin's major is compared.
  const compared = pin !== undefined && /^\d+(\.\d+){0,2}$/.test(pin);
  const note = pin !== undefined && !compared ? ` (pins ${pin}, a prerelease: not compared)` : "";
  const fits = version && (!compared || version.split(".")[0] === pin.split(".")[0]);
  if (unread && (fits || !version)) {
    const found = version ? `${pm} ${version} (from the repo's yarnPath file name, not run)` : `${pm} found on PATH, not run`;
    return { status: "limited", detail: `Node ${node} (needs ${want}), ${found}${note}: version checked after the repo is read` };
  }
  if (fits) return { status: "ok", detail: `Node ${node} (needs ${want}), ${pm} ${version}${note}` };
  return { status: "fix", detail: version ? `${pm} ${version}, the project pins ${pin}` : `${pm} isn't installed`,
    ladder: selfFix(`\`corepack enable && corepack prepare ${pm}@${pin ?? "latest"} --activate\`, then run preflight again.`) };
}

function checkModel(sys, given) {
  const seen = (value, kind) => (value ? shown(value, kind, "unknown") : undefined);
  const model = seen(given.model ?? sys.env.ANTHROPIC_MODEL, "model");
  const effort = seen(given.effort ?? sys.env.CLAUDE_EFFORT, "effort");
  if (!model && !effort) return { status: "info", detail: "not visible to scripts: pass --model and --effort from your own session" };
  return { status: "info", detail: `model ${model ?? "not visible"}, effort ${effort ?? "not visible"}`, model, effort };
}

/** A short hash of what makes this sandbox this sandbox. It moves when the machine, the tool, Node, the project's install settings or its read mark change. */
export const fingerprint = (parts) => createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 12);

function sandboxPrint(dir, tool, sys, pkg, read) {
  const npmrc = existsSync(join(dir, ".npmrc")) ? readFileSync(join(dir, ".npmrc"), "utf8") : "";
  const flags = ["HTTPS_PROXY", "https_proxy", "CODEX_SANDBOX", "CODEX_SANDBOX_NETWORK_DISABLED", "PLAYWRIGHT_BROWSERS_PATH"].map((k) => Boolean(sys.env[k]));
  return fingerprint({ tool, node: sys.node, hostname: sys.hostname, platform: sys.platform, npmrc, engines: [pkg?.engines?.node, pkg?.packageManager], flags, read });
}

/**
 * Runs every probe in dir. Returns { tool, checkedAt, fingerprint, ok, read, state, unsafe, results: [{ id, label, status, detail, ladder }] }.
 * bases: where a test lets tempFolders look.
 */
export async function probe(dir, sys = realSys(), given = {}, { bases } = {}) {
  const tool = given.tool ?? detectTool(sys.env);
  const pkg = readJson(join(dir, "package.json"));
  const manager = readManager(pkg);
  const pm = manager?.name ?? Object.entries(LOCKS).find(([file]) => existsSync(join(dir, file)))?.[1] ?? "npm";
  const read = isRead(dir);
  // Before the read, every command is found on, and given, a PATH with no folder inside any checkout of the repo (#182).
  // When the repo's layout can't be read, that PATH is empty and the rows that need a command wait for the read.
  const layout = repoLayout(dir);
  const temps = tempFolders(dir, sys.platform, layout, bases);
  const unsafe = [];
  const path = read ? {} : pathOutside(dir, sys.platform, sys.env, layout, unsafe);
  const away = temps.away && { ...temps.away, env: { ...temps.away.env, ...path } };
  // An empty hooks folder: no hook the repo ships, or names in its config, runs on the temp branch. Without one only
  // this user can write, POSIX's /dev/null holds no hook and no one can add one; elsewhere the branch waits for the read (#232).
  const hooksPath = temps.hooks ?? (sys.platform === "win32" ? null : "/dev/null");
  const hooks = hooksPath ? [`core.hooksPath=${hooksPath}`] : [];
  const safe = { read, away, path, hooks: read || Boolean(hooksPath), closed: !read && !layout, git: read ? {} : { config: hooks, env: path } };
  try {
    const loop = await sys.loopback();
    const found = {
      repo: checkRepo(dir, tool),
      git: await checkGit(dir, tool, sys, safe),
      registry: await checkRegistry(dir, tool, sys, pm, safe),
      github: await checkGithub(dir, sys, safe),
      loopback: loop.ok ? { status: "ok", detail: loop.detail } : { status: "blocked", detail: `can't listen on 127.0.0.1: ${loop.detail}`, ladder: ladder("loopback", tool) },
      browser: await checkBrowser(dir, tool, sys, pkg, pm, safe),
      versions: await checkVersions(dir, tool, sys, pkg, manager, safe),
      model: checkModel(sys, given),
    };
    const results = CHECKS.map((id) => ({ id, label: LABELS[id], ladder: [], ...found[id] }));
    const at = new Date(sys.now()).toISOString().replace(/:\d\d\.\d{3}Z$/, "Z");
    const ok = results.every((r) => r.status !== "fix" && r.status !== "blocked");
    // Workflow files or Actions on (#133): a warning with its fix, never a failed row. Before the read, files only.
    const warnings = await ciWarnings(dir, sys, read);
    return { tool, checkedAt: at, fingerprint: sandboxPrint(dir, tool, sys, pkg, read), ok, read, away: !read && Boolean(away),
      state: existsSync(join(dir, "docs", "state.md")), unsafe: [...new Set(unsafe)], results, warnings };
  } finally {
    temps.remove();
  }
}

// Said once, under the table, while the repo isn't marked read.
function unreadNote(report) {
  if (report.read !== false) return [];
  const why = report.state ? "This repo has a docs/state.md, but no session on this machine has marked it read, so it counts as not read. " : "";
  const away = report.away ? " npm, git and gh ran from an empty temp folder outside it that only this user can write, and npm read no project settings above it." : "";
  return ["", `${why}Probes that could run the repo's own code ran nothing from it (the rows that say "after the repo is read").${away}`
    + " /join or /back marks it with `--mark-read`; then run preflight again."];
}

const warningLines = (warnings = []) => (warnings.length ? ["", ...warnings.map((w) => `Warning: ${w}`)] : []);
// A PATH folder left off for another user's sake would make "git isn't installed" mislead, so each one is named (#232).
const unsafeLines = (unsafe = []) => (unsafe.length ? ["", `Left off PATH before the read, as another local user could change what runs from it: ${
  unsafe.map((why) => shown(why, "reason", "a folder that isn't printed")).join("; ")}.`] : []);

/** The one table, each failure's ladder, and a draft of the ONE message for whatever the ladder doesn't clear. */
export function render(report) {
  const out = [`Preflight · ${TOOLS[report.tool]} · ${report.checkedAt}`, "", "| Check | Result | Detail |", "|---|---|---|"];
  for (const r of report.results) out.push(`| ${r.label} | ${MARK[r.status]} | ${r.detail.replace(/\s+/g, " ").replaceAll("|", "\\|")} |`);
  out.push(...unreadNote(report), ...unsafeLines(report.unsafe), ...warningLines(report.warnings));
  const open = report.results.filter((r) => r.status === "fix" || r.status === "blocked");
  const blocked = open.filter((r) => r.status === "blocked");
  if (!open.length) return [...out, "", "Environment: ok."].join("\n");
  out.push("", `${open.length} to fix. Work down each ladder in order, then run preflight again. Ask only for what's left, in ONE message.`);
  if (blocked.some((r) => ["repo", "registry", "versions"].includes(r.id))) out.push("Installs are blocked: don't scaffold or build until they work. Work that needs no install goes on.");
  for (const r of open) out.push("", r.label, ...r.ladder.map((l) => `  ${l.rung}. ${l.text}`));
  if (blocked.length) {
    out.push("", "Still blocked after rungs 1 to 3? Send ONE message. Write all of it, with its Tried line filled in, on the issue",
      "(with issues as files: in the issue's file, under \"## Comments\", plus `needs-human` on its Labels line). Then ping once.",
      "A line in chat or in docs/state.md alone is not the record. The message:", "",
      `Setup step for you · Unblock the agent's sandbox (${TOOLS[report.tool]}) · about 5 minutes`, "",
      ...blocked.map((r, i) => `${i + 1}. ${r.label}: ${r.ladder.at(-1).text.replace(/^The person, last: /, "")}`), "",
      "Tried: <for each one, what you tried on rungs 1 to 3, and why it didn't clear it>",
      "When it worked: the agent runs preflight again and every row shows ✓.");
  }
  return out.join("\n");
}

const RECORD = /^[ \t]*[-*]?[ \t]*\*\*Environment:\*\*[^\n]*$/m;

/** The Environment line of a state file: { ok, open: [ids], fingerprint } or null. */
export function readRecord(text = "") {
  const line = text.match(RECORD)?.[0];
  const m = line && /\*\*Environment:\*\*\s*(ok|open: ([a-z, ]+)) · checked \S+ · \S+ · fp ([0-9a-f]+)/.exec(line);
  return m ? { ok: m[1] === "ok", open: m[2] ? m[2].split(",").map((s) => s.trim()).filter(Boolean) : [], fingerprint: m[3] } : null;
}

/** The text with its Environment line replaced, or added as the first item under the first heading. */
export function withRecord(text, line) {
  if (RECORD.test(text)) return text.replace(RECORD, line);
  const heading = /^#[^\n]*$/m.exec(text);
  if (!heading) return `${line}\n${text}`;
  const end = heading.index + heading[0].length;
  const rest = text.slice(end).replace(/^\n+/, "");
  return `${text.slice(0, end)}\n\n${line}\n${rest.startsWith("- ") ? "" : rest ? "\n" : ""}${rest}`;
}

function recordLine(report) {
  const open = report.results.filter((r) => r.status === "fix" || r.status === "blocked").map((r) => r.id);
  const model = report.results.find((r) => r.id === "model");
  const ran = model.model || model.effort ? ` · model ${model.model ?? "unknown"} · effort ${model.effort ?? "unknown"}` : "";
  return `- **Environment:** ${open.length ? `open: ${open.join(", ")}` : "ok"} · checked ${report.checkedAt} · ${report.tool} · fp ${report.fingerprint}${ran}`;
}

const USAGE = `preflight [dir] [--record] [--if-changed] [--json] [--mark-read] [--model <id>] [--effort <level>] [--tool claude|claude-cloud|codex|other]`;

/** The command line: reads the flags, runs or skips the probes, prints, records. Returns the exit code. */
export async function main(argv, { sys = realSys(), log = console.log } = {}) {
  const given = {};
  const flags = new Set();
  let dir = ".";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (["--model", "--effort", "--tool"].includes(a) && argv[i + 1]) given[a.slice(2)] = argv[++i];
    else if (["--record", "--if-changed", "--json", "--mark-read", "--help", "-h"].includes(a)) flags.add(a);
    else if (a.startsWith("-")) return log(`Unknown option: ${shown(a, "flag", "(not printed)")}\nUsage: ${USAGE}`), 2;
    else dir = a;
  }
  if (given.tool && !Object.hasOwn(TOOLS, given.tool)) return log(`--tool is one of: ${Object.keys(TOOLS).join(", ")}`), 2;
  if (flags.has("--help") || flags.has("-h")) return log(`Usage: ${USAGE}`), 0;
  dir = resolve(dir);
  // Windows: every ACL the checks ask about, read in one PowerShell start (#246). A test's sys may give the reader.
  if (sys.platform === "win32") loadWinAcls(aclPaths(dir, sys.env, tempBases("win32")), sys.winAcls);
  if (flags.has("--mark-read")) {
    // Only the .git next to dir: a folder under a bigger repo (a home-folder repo, say) never marks that repo.
    const marked = markRead(dir);
    if (marked) return log(`Marked this repo read on this machine: ${shown(marked, "path", "(path not printed)")}. Run preflight again: every probe runs now.`), 0;
    const why = markRefusal(dir);
    const what = why ? `A folder another user can write or swap, so not marked: ${shown(why, "reason", "the folder isn't printed")}.`
      : "No .git folder of its own in this folder, a .git file preflight doesn't follow, or a folder another user can write: not marked.";
    return log(`${what} Run it in the repo's top folder, after \`git init\` if there's none, in a folder only you can write.`), 1;
  }
  const statePath = join(dir, "docs", "state.md");
  const state = existsSync(statePath) ? readFileSync(statePath, "utf8") : null;

  if (flags.has("--if-changed")) {
    const tool = given.tool ?? detectTool(sys.env);
    const record = readRecord(state ?? "");
    const read = isRead(dir);
    if (record?.ok && record.fingerprint === sandboxPrint(dir, tool, sys, readJson(join(dir, "package.json")), read)) {
      const detail = "Environment: ok on record, and nothing changed. Skipped the probes. Run without --if-changed to check again.";
      // Still unmarked: the note goes with the skip too, so /back and build learn to mark it.
      const note = unreadNote({ read, state: state !== null });
      const warnings = await ciWarnings(dir, null, false);
      return log(flags.has("--json") ? JSON.stringify({ ok: true, skipped: true, read, fingerprint: record.fingerprint, detail, note: note[1], warnings }, null, 2)
        : [detail, ...note, ...warningLines(warnings)].join("\n")), 0;
    }
  }
  const report = await probe(dir, sys, given);
  log(flags.has("--json") ? JSON.stringify(report, null, 2) : render(report));
  if (flags.has("--record")) {
    if (state === null) flags.has("--json") || log("No docs/state.md yet: not recorded. Run it with --record again once the state file exists.");
    else writeFileSync(statePath, withRecord(state, recordLine(report)));
  }
  return report.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
