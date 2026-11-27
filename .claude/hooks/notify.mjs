#!/usr/bin/env node
// Tell the person when an agent needs them. Two ways in:
//
// 1. A hook: no arguments, the hook's JSON on stdin. Prints nothing.
//    Claude Code Notification hook (.claude/settings.json): a permission prompt counts as
//    a blocker, "waiting for your input" as a decision.
//    Codex hooks (.codex/hooks.json): PermissionRequest is a blocker; Stop (the turn
//    ended, so it waits for you) is a decision, which the batch window keeps to one ping.
// 2. A CLI any agent can call (Claude Code, Codex, a script):
//      node .claude/hooks/notify.mjs --level blocker|decision|fyi --title "<what>"
//           [--message "<questions, and what happens if you don't answer>"] [--link <url>]
//           [--issue N] [--critical] [--project <name>] [--print]
//      node .claude/hooks/notify.mjs --flush   send held pings whose time has come (each sweep)
//      node .claude/hooks/notify.mjs --clear   drop held pings (after /back has shown them)
//    It prints what it did as JSON: sent, batched, held or recorded.
//
// The rules (the `ask` skill has the full convention):
// - blocker: ping now. decision: one batched ping at most every [notify] batch_minutes (default 30).
//   fyi: never pings; recorded on the board for /back.
// - presence away (~/.onrails/presence.json): only --critical pings. The rest waits for /back.
// - [notify] quiet_hours = "22:00-07:00" (local time): held until they end, except --critical.
// - ping level, from docs/stack.md ("Ping level:") or [notify] ping:
//   decisions (default) | blockers (decisions don't ping) | critical (only critical pings).
// - Desktop notification on macOS, Windows and Linux ([notify] desktop = false turns it off).
//   Phone too, if NTFY_TOPIC is set (the free ntfy app; NTFY_SERVER moves it off ntfy.sh).
// Held and batched pings live in ~/.onrails/notify-batch.json, next to presence.json.
// Until the person moves it, ~/.ai-dev-workflow/ (the old name) is used instead of ~/.onrails/.
// --print skips the actual delivery (for tests); ONRAILS_NOW sets the clock (for tests).
// ADW_NOW and ADW_NOTIFY_PRINT, the names before the rename, still work.
// Never blocks or fails the agent: every error is swallowed.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

// ~/.onrails, or ~/.ai-dev-workflow (its name before the rename to onRails) while only that one exists.
const NEW_HOME = join(homedir(), ".onrails"), OLD_HOME = join(homedir(), ".ai-dev-workflow");
const HOME_DIR = !existsSync(NEW_HOME) && existsSync(OLD_HOME) ? OLD_HOME : NEW_HOME;
const BATCH = join(HOME_DIR, "notify-batch.json");
const PRESENCE = join(HOME_DIR, "presence.json");
const NOW = process.env.ONRAILS_NOW || process.env.ADW_NOW;
const now = () => (NOW ? new Date(NOW) : new Date());
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? undefined : argv[i + 1]; };
const has = (name) => argv.includes(name);
const PRINT = has("--print") || (process.env.ONRAILS_NOTIFY_PRINT || process.env.ADW_NOTIFY_PRINT) === "1";

function rootOf(dir) {
  try { return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return dir; }
}

// One key from [section]: docs/profile.toml in the project first, then the home profile.
function setting(root, section, key) {
  for (const p of [join(root, "docs", "profile.toml"), join(HOME_DIR, "profile.toml")]) {
    let text;
    try { text = readFileSync(p, "utf8"); } catch { continue; }
    const body = text.split(new RegExp(`^\\[${section}\\]\\s*$`, "m"))[1]?.split(/^\[/m)[0];
    const m = body?.match(new RegExp(`^\\s*${key}\\s*=\\s*("([^"]*)"|[^\\s#]+)`, "m"));
    if (m) { const v = m[2] ?? m[1]; if (v !== "") return v; }
  }
  return undefined;
}

function config(root) {
  let ping;
  try {
    ping = readFileSync(join(root, "docs", "stack.md"), "utf8").match(/ping level:?\**\s*`?(decisions|blockers|critical)\b/i)?.[1];
  } catch {}
  ping = (ping || setting(root, "notify", "ping") || "decisions").toLowerCase();
  const minutes = Number(setting(root, "notify", "batch_minutes"));
  return {
    ping,
    batchMs: (Number.isFinite(minutes) && minutes >= 0 ? minutes : 30) * 60e3,
    quiet: setting(root, "notify", "quiet_hours") || "",
    desktop: setting(root, "notify", "desktop") !== "false",
  };
}

const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; } };
// False when the home folder can't be written (for example a Codex sandbox without
// ~/.onrails in [sandbox_workspace_write] writable_roots).
function saveBatch(state) {
  try {
    mkdirSync(HOME_DIR, { recursive: true });
    const tmp = `${BATCH}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
    renameSync(tmp, BATCH);
    return true;
  } catch { return false; }
}
const NOT_SAVED = { saved: false, warning: `could not save ${BATCH} (a sandbox? allow writes to ${HOME_DIR})` };
const away = () => readJson(PRESENCE, { status: "here" }).status === "away";

// "22:00-07:00" -> the Date the current quiet stretch ends, or null if not quiet now.
function quietUntil(spec, at = now()) {
  const m = String(spec).match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) return null;
  const start = +m[1] * 60 + +m[2], end = +m[3] * 60 + +m[4];
  const mins = at.getHours() * 60 + at.getMinutes();
  const inside = start <= end ? mins >= start && mins < end : mins >= start || mins < end;
  if (!inside) return null;
  const until = new Date(at);
  until.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (until <= at) until.setDate(until.getDate() + 1);
  return until;
}

// ---------- delivery ----------

function desktop(title, body) {
  const run = (cmd, args) => { try { spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref(); } catch {} };
  const short = body.slice(0, 200);
  if (process.platform === "darwin") run("osascript", ["-e", `display notification ${JSON.stringify(short)} with title ${JSON.stringify(title)}`]);
  else if (process.platform === "win32") {
    const ps = `[void][Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');` +
      `$n=New-Object System.Windows.Forms.NotifyIcon;$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;` +
      `$n.ShowBalloonTip(8000,${JSON.stringify(title)},${JSON.stringify(short)},'Info');Start-Sleep -s 8;$n.Dispose()`;
    run("powershell", ["-NoProfile", "-Command", ps]);
  } else run("notify-send", [title, short]);
}

async function deliver(msg, cfg) {
  if (PRINT) return { delivered: false, title: msg.title, body: msg.body };
  if (cfg.desktop) desktop(msg.title, msg.body);
  const topic = process.env.NTFY_TOPIC;
  if (topic) {
    const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
    const q = new URLSearchParams({ title: msg.title, priority: String(msg.priority), tags: msg.tags });
    if (msg.link) q.set("click", msg.link);
    try { await fetch(`${server}/${encodeURIComponent(topic)}?${q}`, { method: "POST", body: msg.body.slice(0, 4000), signal: AbortSignal.timeout(5000) }); } catch {}
  }
  return { delivered: true, title: msg.title };
}

const ICON = { blocker: "🛑", decision: "⏳", fyi: "ℹ️" };
function compose(items) {
  if (items.length === 1) {
    const it = items[0];
    return {
      title: `Needs you · ${it.project} · ${it.title}`,
      body: [it.critical ? "🛑 Critical." : ICON[it.level], it.message, it.link].filter(Boolean).join("\n"),
      link: it.link,
      priority: it.critical ? 5 : it.level === "blocker" ? 4 : 3,
      tags: it.critical ? "rotating_light" : it.level === "blocker" ? "octagonal_sign" : "hourglass",
    };
  }
  const projects = [...new Set(items.map((i) => i.project))];
  const blockers = items.filter((i) => i.level === "blocker").length;
  return {
    title: `Needs you · ${projects.length === 1 ? projects[0] : `${projects.length} projects`} · ${items.length} things waiting`,
    body: items.map((i) => `${ICON[i.level]} ${projects.length > 1 ? `${i.project}: ` : ""}${i.title}${i.link ? ` ${i.link}` : ""}`).join("\n"),
    link: items.find((i) => i.link)?.link,
    priority: blockers ? 4 : 3,
    tags: blockers ? "octagonal_sign" : "hourglass",
  };
}

// ---------- the rules ----------

// Sends everything held, if nothing stops it: not away, not quiet, and either a held
// blocker or a decision batch whose interval has passed.
async function flush(state, cfg, { force = false } = {}) {
  if (!state.pending.length || away() || quietUntil(cfg.quiet)) return null;
  const due = now() - Date.parse(state.lastSent || 0) >= cfg.batchMs;
  if (!force && !due && !state.pending.some((p) => p.level === "blocker")) return null;
  const items = state.pending;
  const result = await deliver(compose(items), cfg);
  state.pending = [];
  state.lastSent = now().toISOString();
  return { ...result, sent: items.length };
}

async function handle(item, cfg, { hook = false } = {}) {
  const state = readJson(BATCH, { lastSent: null, pending: [] });
  state.pending ??= [];
  let out;
  if (item.level === "fyi") out = { action: "recorded", reason: "fyi never pings; it shows on the board and at /back" };
  else if (item.critical) out = { action: "sent", ...(await deliver(compose([item]), cfg)) };
  else if (cfg.ping === "critical" || (cfg.ping === "blockers" && item.level === "decision")) {
    out = { action: "recorded", reason: `ping level is "${cfg.ping}"; it waits for /back` };
  } else if (away()) {
    state.pending.push(item);
    out = { action: "held", reason: "the person is away; it waits for /back" };
  } else if (quietUntil(cfg.quiet)) {
    state.pending.push(item);
    out = { action: "held", reason: "quiet hours", until: quietUntil(cfg.quiet).toISOString() };
  } else {
    state.pending.push(item);
    const sent = await flush(state, cfg, { force: item.level === "blocker" });
    out = sent
      ? { action: "sent", ...sent }
      : { action: "batched", nextAt: new Date(Date.parse(state.lastSent) + cfg.batchMs).toISOString(), waiting: state.pending.length };
  }
  if (out.action !== "recorded" && !saveBatch(state)) Object.assign(out, NOT_SAVED);
  if (!hook) console.log(JSON.stringify({ level: item.level, ...out }));
}

// Records the ask on the board (if the board script is in this repo and the home folder is writable).
function boardEvent(root, item) {
  const script = join(root, ".agents", "skills", "coordinate", "scripts", "board.mjs");
  if (!existsSync(script)) return;
  const fields = { title: item.title, level: item.level === "fyi" ? undefined : item.level, link: item.link || undefined, issue: item.issue, note: item.message?.split("\n")[0] || undefined };
  const args = [script, "event", item.level === "fyi" ? "fyi" : "needs-you", JSON.stringify(fields), "--project", item.project];
  try { spawnSync(process.execPath, args, { cwd: root, stdio: "ignore", timeout: 5000 }); } catch {}
}

// ---------- main ----------

async function cli() {
  const root = rootOf(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const cfg = config(root);
  if (has("--clear")) {
    const state = readJson(BATCH, { pending: [] });
    const dropped = (state.pending || []).length;
    const saved = saveBatch({ ...state, pending: [] });
    return console.log(JSON.stringify({ action: "cleared", dropped, ...(saved ? {} : NOT_SAVED) }));
  }
  if (has("--flush")) {
    const state = readJson(BATCH, { lastSent: null, pending: [] });
    state.pending ??= [];
    const sent = await flush(state, cfg);
    const saved = saveBatch(state);
    const out = sent ? { action: "sent", ...sent } : { action: "nothing due", waiting: state.pending.length };
    return console.log(JSON.stringify(saved ? out : { ...out, ...NOT_SAVED }));
  }
  const level = flag("--level");
  if (!["blocker", "decision", "fyi"].includes(level) || !flag("--title")) {
    return console.log("Usage: notify.mjs --level blocker|decision|fyi --title <what> [--message <text>] [--link <url>] [--issue N] [--critical] [--print] | --flush | --clear");
  }
  const item = {
    level,
    critical: has("--critical") && level === "blocker",
    project: flag("--project") || basename(root),
    title: String(flag("--title")).slice(0, 120),
    message: flag("--message") ? String(flag("--message")).replace(/\\n/g, "\n") : "",
    link: flag("--link") || "",
    issue: flag("--issue") ? Number(String(flag("--issue")).replace("#", "")) || undefined : undefined,
    ts: now().toISOString(),
  };
  if (!has("--no-board")) boardEvent(root, item);
  await handle(item, cfg);
}

// Reads either tool's hook JSON. Both send cwd and hook_event_name.
//   Claude Code Notification: { notification_type, message }
//   Codex PermissionRequest:   { tool_name, tool_input }
//   Codex Stop:                { stop_hook_active, last_assistant_message }
function fromHook(input) {
  const event = String(input.hook_event_name || "");
  // The tool's input and the agent's last message are left out on purpose: pings can go
  // to a phone through ntfy, and a command line can carry a token.
  if (event === "PermissionRequest") return { level: "blocker", title: `Approval needed: ${String(input.tool_name || "a tool").slice(0, 60)}`, message: "" };
  if (event === "Stop") return input.stop_hook_active ? null : { level: "decision", title: "Waiting for your input", message: "" };
  const type = String(input.notification_type || "");
  const message = String(input.message || "Your agent needs you").slice(0, 200);
  const level = /idle/.test(type) || /waiting for your input/i.test(message) ? "decision" : /auth_success/.test(type) ? "fyi" : "blocker";
  return { level, title: message, message: "" };
}

async function hook(raw) {
  let input = {};
  try { input = JSON.parse(raw || "{}"); } catch {}
  const root = rootOf(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const got = fromHook(input);
  if (!got || got.level === "fyi") return;
  await handle({ ...got, critical: false, project: basename(root), link: "", ts: now().toISOString() }, config(root), { hook: true });
}

try {
  if (argv.length) await cli();
  else if (process.stdin.isTTY) await cli();
  else {
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => { hook(raw).catch(() => {}); });
  }
} catch {}
