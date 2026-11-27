#!/usr/bin/env node
// Work log: timestamps for sessions, /back and /afk, kept OUTSIDE the repo at
//   ~/.onrails/worklog/<project>.jsonl
// so it's never committed. Opt-in: only writes when a profile has
//   [worklog]
//   enabled = true
// (docs/profile.toml in the project, or ~/.onrails/profile.toml).
// Until the person moves it, ~/.ai-dev-workflow/ (the old name) is used instead of ~/.onrails/.
//
//   node worklog.mjs log <event> [note]     event: session-start | session-end | back | afk | active
//   node worklog.mjs active                 throttled heartbeat (prompt hook): at most every 5 min
//   node worklog.mjs presence [afk <note> | back | announced]   read or set ~/.onrails/presence.json
//        afk flags: --until <hard stop, ISO time> --merge "<what may merge>" --pings "<what pings>"
//                   --open-ended: no hard stop (Full automation), so the away never goes stale
//   node worklog.mjs presence --shared '<Presence row JSON>'   read local, then the sheet's copy
//   node worklog.mjs presence sheet         the Presence tab's values, for the Google Sheets connector
//   node worklog.mjs report [--days N]      hours per day for this project (default 7 days)
//   node worklog.mjs report --all           every project
//   node worklog.mjs pending [--mark]       entries not yet copied to the Google Sheet
// Hooks: Claude Code (.claude/settings.json) and Codex (.codex/hooks.json) run `active`
// on every prompt and `log session-end`; the session-start hook runs `log session-start`.
// The hook's stdin is ignored. Never fails loudly when used from a hook.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { basename, join } from "node:path";

// ~/.onrails, or ~/.ai-dev-workflow (its name before the rename to onRails) while only that one exists.
const NEW_HOME = join(homedir(), ".onrails"), OLD_HOME = join(homedir(), ".ai-dev-workflow");
const HOME_DIR = !existsSync(NEW_HOME) && existsSync(OLD_HOME) ? OLD_HOME : NEW_HOME;
let LOG_DIR = join(HOME_DIR, "worklog");
let MODE = "explicit";      // explicit: /afk stops the clock | activity: a quiet gap stops it (profile: mode)
let AWAY_GAP_MIN = 60;      // activity mode: no activity anywhere for this long counts as away (profile: away_after_minutes)
const FORGOT_AFK_HOURS = 8; // explicit mode: a gap this long with no /afk ends the stretch at the last activity
const TAIL_MIN = 5;        // credit after the last activity in a stretch
const HEARTBEAT_MIN = 5;   // the prompt hook logs at most this often per project and machine
const PRESENCE = join(HOME_DIR, "presence.json");

// Claude Code sets CLAUDE_PROJECT_DIR. Codex runs hooks and commands in the session's
// folder. Either way, climb to the git root.
function projectRoot() {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return dir;
  }
}

// Reads [worklog] from the project profile, then the home profile.
// enabled = true turns it on; dir = "<folder>" moves the log (e.g. a Google Drive folder).
function settings(root) {
  for (const p of [join(root, "docs", "profile.toml"), join(HOME_DIR, "profile.toml")]) {
    if (!existsSync(p)) continue;
    const section = readFileSync(p, "utf8").split(/^\[worklog\]\s*$/m)[1];
    if (section === undefined) continue;
    const body = section.split(/^\[/m)[0];
    const dir = body.match(/^\s*dir\s*=\s*"([^"]+)"/m)?.[1];
    const gap = Number(body.match(/^\s*away_after_minutes\s*=\s*(\d+)/m)?.[1]);
    if (gap > 0) AWAY_GAP_MIN = gap;
    const mode = body.match(/^\s*mode\s*=\s*"(explicit|activity)"/m)?.[1];
    if (mode) MODE = mode;
    return { enabled: /^\s*enabled\s*=\s*true\b/m.test(body), dir: dir ? dir.replace(/^~(?=$|[\\/])/, homedir()) : null };
  }
  return { enabled: false, dir: null };
}

function logFile(project) {
  return join(LOG_DIR, `${project.replace(/[^\w.-]/g, "_")}.jsonl`);
}

function log(event, note) {
  const root = projectRoot();
  const cfg = settings(root);
  if (!cfg.enabled) return;
  if (cfg.dir) LOG_DIR = cfg.dir;
  mkdirSync(LOG_DIR, { recursive: true });
  const entry = { ts: new Date().toISOString(), project: basename(root), event, host: hostname() };
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (branch) entry.branch = branch;
  } catch {}
  if (note) entry.note = note;
  appendFileSync(logFile(basename(root)), JSON.stringify(entry) + "\n");
}

// Presence is shared by every thread on this machine. Loops read it before each sweep.
// Coming back from "away" records returnedAt, so /back can tell it was a real return
// even though the prompt hook already flipped the status to "here".
// The only copy off this machine is the Presence tab of the [board] sheet, which the skills
// write through the Google Sheets connector. Never the repo: presence is personal.
function readLocal() {
  try { return JSON.parse(readFileSync(PRESENCE, "utf8")); } catch { return null; }
}
const readPresence = () => readLocal() || { status: "here" };

// A machine label for the sheet: [presence] machine in the profile, else the hostname.
function machine() {
  for (const p of [join(projectRoot(), "docs", "profile.toml"), join(HOME_DIR, "profile.toml")]) {
    const body = existsSync(p) ? readFileSync(p, "utf8").split(/^\[presence\]\s*$/m)[1]?.split(/^\[/m)[0] : undefined;
    const label = body?.match(/^\s*machine\s*=\s*"([^"]+)"/m)?.[1];
    if (label) return label;
  }
  return hostname();
}

// An away with a hard stop counts as unknown once that time passes. One with no hard stop counts as unknown
// after a day, since the session that set it may be dead, unless it's open-ended (Full automation): that
// only ends with /back.
const STALE_MS = 24 * 3600e3;
function isStale(p) {
  const now = Date.now();
  if (p.status !== "away") return false;
  if (p.until) return Date.parse(p.until) < now;
  return !p.openEnded && now - Date.parse(p.since) > STALE_MS;
}
const view = (p) => (isStale(p) ? { ...p, status: "unknown", stale: true } : p);

// `presence afk` flags; the words left over are the note (local only, never shared).
function afkArgs(args) {
  const out = { note: [], rules: {} };
  for (let i = 0; i < args.length; i++) {
    const [flag, value] = [args[i], args[i + 1]];
    if (flag === "--until" && Date.parse(value)) { out.until = new Date(Date.parse(value)).toISOString(); i++; }
    else if (flag === "--merge" || flag === "--pings") { out.rules[flag.slice(2)] = value; i++; }
    else if (flag === "--open-ended") out.openEnded = true;
    else out.note.push(flag);
  }
  return { ...out, note: out.note.join(" ") };
}

function setPresence(status, afk = { note: "", rules: {} }) {
  const prev = readPresence();
  if (status === "here" && prev.status !== "away") return prev;
  const since = new Date().toISOString();
  const next = status === "away"
    ? { status, since, until: afk.until, openEnded: afk.until ? undefined : afk.openEnded, rules: Object.keys(afk.rules).length ? afk.rules : undefined, machine: machine(), note: afk.note || undefined, project: basename(projectRoot()) }
    : { status, since, returnedAt: since, machine: machine(), awayNote: prev.note, awaySince: prev.since };
  mkdirSync(HOME_DIR, { recursive: true });
  writeFileSync(PRESENCE, JSON.stringify(next) + "\n");
  return next;
}

// The Presence tab: one header row and one value row. Only status, times, machine and rules.
const SHEET_HEADER = ["Status", "Since (UTC)", "Until (UTC)", "May merge", "Pings", "Machine"];
function sheetValues(p) {
  return { range: "Presence!A1:F2", valueInputOption: "RAW", values: [SHEET_HEADER, [p.status, p.since || "", p.until || "", p.rules?.merge || "", p.rules?.pings || "", p.machine || ""]] };
}
function fromRow(json) {
  const row = JSON.parse(json);
  const [status, since, until, merge, pings, mach] = Array.isArray(row[0]) ? row[row.length - 1] : row;
  if (!status || !since) return null;
  return { status, since, until: until || undefined, rules: merge || pings ? { merge, pings } : undefined, machine: mach || undefined };
}

// Local first. The sheet's copy wins only when there's no local file, or it's newer.
function current(sharedJson) {
  const local = readLocal();
  let shared = null;
  try { shared = sharedJson ? fromRow(sharedJson) : null; } catch { shared = null; }
  if (shared && (!local || Date.parse(shared.since) > Date.parse(local.since || 0))) return { ...view(shared), source: "sheet" };
  return { ...view(local || { status: "here" }), source: local ? "local" : "default" };
}

function readEntries(file) {
  return readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  }).sort((a, b) => a.ts.localeCompare(b.ts));
}

// Two ways to count, set by [worklog] mode:
// explicit (default): the clock starts at the first activity after an /afk (or of the
//   day) and stops at /afk. Gaps and extra /back's don't stop it. If no /afk comes and
//   the next activity is FORGOT_AFK_HOURS later, the stretch ends at the last activity
//   and is flagged.
// activity: every prompt is a sign of presence; a gap longer than AWAY_GAP_MIN, or an
//   /afk, ends the stretch.
// session-end never counts as leaving: other threads may still be running.
function spans(entries) {
  const out = [];
  const gapMs = (MODE === "explicit" ? FORGOT_AFK_HOURS * 60 : AWAY_GAP_MIN) * 60e3;
  let first = null, last = null;
  const close = (endAt, flagged) => { if (first !== null) out.push({ start: first, end: endAt, estimate: !!flagged }); first = last = null; };
  for (const e of entries) {
    if (e.event === "session-end") continue;
    const t = Date.parse(e.ts);
    if (last !== null && t - last > gapMs) close(last + TAIL_MIN * 60e3, MODE === "explicit");
    if (e.event === "afk") { if (first !== null) close(t); continue; }
    if (first === null) first = t;
    last = t;
  }
  if (first !== null) {
    if (MODE === "explicit" && Date.now() - last <= gapMs) close(Date.now()); // still on the clock
    else close(Math.min(Date.now(), last + TAIL_MIN * 60e3), MODE === "explicit");
  }
  return out;
}

function report(files, days) {
  const since = Date.now() - days * 86400e3;
  const byDay = new Map();
  let total = 0, estimated = 0;
  for (const f of files) for (const s of spans(readEntries(f))) {
    if (s.end < since) continue;
    const h = (s.end - Math.max(s.start, since)) / 3600e3;
    const day = new Date(s.start).toLocaleDateString("en-CA");
    byDay.set(day, (byDay.get(day) || 0) + h);
    total += h;
    if (s.estimate) estimated += h;
  }
  if (!byDay.size) return console.log(`No work logged in the last ${days} days.`);
  for (const [day, h] of [...byDay].sort()) console.log(`${day}  ${h.toFixed(1)} h`);
  const how = MODE === "explicit" ? "clock runs from your first prompt until /afk" : `a gap of ${AWAY_GAP_MIN} min with no activity counts as away`;
  console.log(`Total  ${total.toFixed(1)} h over ${days} days (${how})${estimated ? `. ${estimated.toFixed(1)} h had no /afk and ended at the last prompt` : ""}`);
}

const [cmd, a1, ...rest] = process.argv.slice(2);
try {
  if (cmd === "log" && a1) log(a1, rest.join(" "));
  else if (cmd === "active") {
    // Prompt hook: the person is here. Clear an afk, and log at most every HEARTBEAT_MIN.
    setPresence("here");
    const root = projectRoot();
    const cfg = settings(root);
    if (cfg.enabled) {
      if (cfg.dir) LOG_DIR = cfg.dir;
      const file = logFile(basename(root));
      const mine = existsSync(file) ? readEntries(file).filter((e) => e.host === hostname()) : [];
      const lastT = mine.length ? Date.parse(mine[mine.length - 1].ts) : 0;
      if (Date.now() - lastT >= HEARTBEAT_MIN * 60e3) log("active");
    }
  }
  else if (cmd === "presence") {
    // A sandbox that can't write the home folder (Codex without ~/.onrails in
    // writable_roots) must not look like success: say so in the JSON.
    if (a1 === "sheet") { console.log(JSON.stringify(sheetValues(readPresence()))); process.exit(0); }
    let saved = true;
    const write = (fn) => { try { fn(); } catch { saved = false; } };
    const wasStale = isStale(readPresence());
    if (a1 === "afk") write(() => { const afk = afkArgs(rest); setPresence("away", afk); log("afk", afk.note); });
    else if (a1 === "back") write(() => { setPresence("here"); log("back"); });
    else if (a1 === "announced") write(() => { const cur = readPresence(); cur.announced = true; writeFileSync(PRESENCE, JSON.stringify(cur) + "\n"); });
    const p = a1 === "--shared" ? current(rest[0]) : current();
    if (!saved) Object.assign(p, { saved: false, warning: `could not save ${PRESENCE} (a sandbox? allow writes to ${HOME_DIR})` });
    // staleAway: /back cleared an away nobody ended on time, so say so in the report.
    if (a1 === "back" && wasStale) p.staleAway = true;
    // justReturned: this person came back from an /afk in the last 10 minutes, so /back should tell the other threads.
    p.justReturned = p.status === "here" && !!p.returnedAt && !p.announced && Date.now() - Date.parse(p.returnedAt) < 10 * 60e3;
    console.log(JSON.stringify(p));
  }
  else if (cmd === "pending") {
    // Entries not yet copied to the Google Sheet, as JSON lines; --mark records them as copied.
    const root = projectRoot();
    const cfg = settings(root);
    if (cfg.dir) LOG_DIR = cfg.dir;
    const file = logFile(basename(root));
    const mark = `${file}.synced`;
    const done = existsSync(mark) ? Number(readFileSync(mark, "utf8")) || 0 : 0;
    const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean) : [];
    if (a1 === "--mark") { writeFileSync(mark, String(lines.length)); }
    else for (const l of lines.slice(done)) console.log(l);
  }
  else if (cmd === "report") {
    const days = rest.includes("--days") ? Number(rest[rest.indexOf("--days") + 1]) : a1 === "--days" ? Number(rest[0]) : 7;
    const all = a1 === "--all" || rest.includes("--all");
    const cfg = settings(projectRoot());
    if (cfg.dir) LOG_DIR = cfg.dir;
    if (!existsSync(LOG_DIR)) { console.log("No work log yet. Turn it on with [worklog] enabled = true in your profile."); process.exit(0); }
    const files = all ? readdirSync(LOG_DIR).filter((f) => f.endsWith(".jsonl")).map((f) => join(LOG_DIR, f)) : [logFile(basename(projectRoot()))].filter(existsSync);
    report(files, days || 7);
  } else {
    console.log("Usage: worklog.mjs log <session-start|session-end|back|afk> [note]  |  worklog.mjs report [--days N] [--all]");
  }
} catch {
  // never break a session over the work log
}
