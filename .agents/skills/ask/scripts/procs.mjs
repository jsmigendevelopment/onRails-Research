#!/usr/bin/env node
// The process registry (#126): every background process an agent starts gets a record, so it is
// stopped when its task is done, when the person says pause or stop, and when the session ends.
// The parts: procs-store.mjs (the files), procs-records.mjs (what's true about a record), procs-stop.mjs
// (the check before every signal, then TERM and KILL), procs-hooks.mjs (the watcher and the hooks). No dependencies.
//   node procs.mjs start --why "<why>" --until "<stop condition>" [--for <minutes>] -- <command> [args...]
//        starts it in the background in its own process group; its output goes to .onrails/logs/<id>.log
//   node procs.mjs list [--mine] [--json]           age, owner and whether it's alive, CPU, memory, stale
//   node procs.mjs stop <id|mine|stale|all|pid> [--yes] [--grace <s>]   TERM to its group or tree, KILL after 5 s
//   node procs.mjs pause [<id>...]                  this session's records stay, marked paused, until
//                                                   [workflow] pause_hours (2) pass or the session ends
//   node procs.mjs resume                           back from a pause
//   node procs.mjs session-start | session-end      the hooks: warn about orphans; stop this session's records
//   node procs.mjs ps [dir] [--stop <x>] [--yes]    list and stop, for npx onrails ps
// list, ps and doctor only read. stop and the session hooks also drop the records of processes that have exited.
// A record's owner is the session (CLAUDE_CODE_SESSION_ID, the hook's session_id, or --owner) and the
// agent's own process (claude or codex) with its start time. Stale: it still runs, but its owner is gone,
// or its --for time or its pause has passed. A process it didn't record, or one another live session started,
// is stopped only after a yes. Every record is checked before a signal (procs-stop.mjs): a record with no start
// time, or a PID whose start time changed, is left alone.
// Exit 0: done. 1: something was refused or can't be read. 2: a bad flag.
// The master copy is scripts/procs.mjs in the kit; sync-skills.mjs copies it into the ask skill and the CLI.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureWatcher, readGuard, reap, sessionEnd, sessionStart, watch } from "./procs-hooks.mjs";
import { MINUTE, SCRIPT, age, iso, newId, newRecord, survey, whoAmI } from "./procs-records.mjs";
import { FIX, askAgain, fixable, homeDir, logFor, registryPath, untrusted, update } from "./procs-store.mjs";
import { GRACE_S, NO_LIST, floor, forget, guarded, stopRecords } from "./procs-stop.mjs";
import { realSys } from "./procs-sys.mjs";

const SELF = fileURLToPath(import.meta.url);
const PAUSE_HOURS = 2;

function row(r, now) {
  const state = r.stale ? `STALE: ${r.stale}` : r.state === "paused" ? `paused until ${r.pausedUntil}` : "running";
  const usage = [r.cpu, r.mem ? `${Math.round(r.mem / 1024)} MB` : null].filter(Boolean).join(" · ");
  const owner = r.owner === "unknown" ? r.label : `${r.label} (${r.owner})`;
  return [`- ${r.id} · ${state} · pid ${r.pid} · ${age(now - Date.parse(r.startedAt))}${usage ? ` · ${usage}` : ""} · owner ${owner}`,
    `    ${r.command} · why: ${r.why} · until: ${r.until}`].join("\n");
}

/** For doctor: how many records there are, the stale ones, and why each registry skipped for a mode was skipped. It writes nothing. */
export function staleSummary(dir, { sys = realSys() } = {}) {
  const seen = survey(sys, dir, { session: null, agent: null }), skipped = fixable(sys, dir);
  return seen ? { total: seen.length, stale: seen.filter((r) => r.stale), skipped } : { total: 0, stale: [], skipped, unreadable: true };
}

const fail = (log, message, code = 2) => (log(message), code);
const NO_PS = "Can't read the process list here (ps failed), so nothing was changed.";
const yes = async (ask, question) => Boolean(ask) && /^y(es)?$/i.test(await ask(`${question} [y/N] `));

function list(sys, log, { dir, me, mine, json, hint }) {
  const seen = survey(sys, dir, me);
  if (!seen) return fail(log, NO_PS, 1);
  const shown = mine ? seen.filter((r) => r.mine) : seen;
  if (json) return log(JSON.stringify(shown, null, 2)), 0;
  // A registry skipped for its mode is named first, so "nothing is running" never hides it.
  const skipped = fixable(sys, dir);
  for (const why of skipped) log(`Not read: ${why}. Until then its processes aren't listed or stopped.`);
  const others = skipped.length ? " else" : "";
  if (!shown.length) return log(mine ? `Nothing${others} this session started is running.` : `Nothing${others} registered is running.`), 0;
  log(`${mine ? "This session's" : "Registered"} background processes (${shown.length}):`);
  for (const r of shown) log(row(r, sys.now()));
  const stale = shown.filter((r) => r.stale).length;
  if (stale) log(`Stale: ${stale}. Stop them: ${hint}`);
  return 0;
}

// What start says after a refusal. A chmod on this user's own registry keeps its records and their processes. A
// reason with its own fix says it (FIX, as list, ps and doctor use). Only a reason about the registry's own folder
// says to delete one, and names it: never the home folder, the repo or a folder above it (#231).
function afterRefusal(why, dir) {
  if (why.includes("chmod")) return "Then start it again.";
  if (FIX.test(why)) return "Do what it says, or ask the person.";
  return why.includes(dir) ? `Delete ${dir} or ask the person.` : "Ask the person.";
}

function start(sys, log, { path, me, flags, command }) {
  if (!flags.why || !flags.until) return fail(log, "Give every background process a reason and a stop condition: --why \"...\" --until \"...\"");
  if (flags.for !== undefined && !(Number(flags.for) > 0)) return fail(log, "--for takes minutes, more than 0");
  if (!command.length) return fail(log, "Name the command after --: start --why ... --until ... -- pnpm dev");
  const why = untrusted(sys, path);
  if (why) return fail(log, `Nothing started: the registry can't be used (${why}). ${afterRefusal(why, dirname(path))}`, 1);
  const id = newId(sys, path);
  const logFile = logFor(sys, path, id);
  const pid = sys.spawn(command, { cwd: sys.cwd, log: logFile });
  if (!pid) return fail(log, `Couldn't start ${command[0]}. Is it installed and on PATH?`, 1);
  // A record with no start time could later match any process with that PID, so it is never written.
  const begun = sys.info([pid])?.get(pid)?.start;
  if (!begun) {
    sys.killSpawned(pid);
    return fail(log, `${command[0]} exited at once, or its start time can't be read, so it isn't recorded and was stopped. Its output: ${logFile}`, 1);
  }
  const fields = { id, pid, group: sys.platform !== "win32", start: begun, command: command.join(" "), log: logFile };
  try { update(sys, path, (procs) => [...procs, newRecord(sys, me, flags, fields)]); } catch (error) {
    sys.killSpawned(pid); // through its own handle: nothing it can't record is left running
    return fail(log, `${command[0]} was stopped: ${error.message}.`, 1);
  }
  if (flags.for) ensureWatcher(sys, path, me);
  log(`${id} · pid ${pid} · output: ${logFile}`);
  return 0;
}

// Asks before it stops a PID it didn't record. A person's yes, or --yes after one, is the only way past.
async function stopUnregistered(sys, log, pid, { flags, ask, stopCmd }) {
  const p = sys.info([pid])?.get(pid);
  if (!p) return fail(log, `No running process has PID ${pid}.`, 1);
  if (!flags.yes && !(await yes(ask, `PID ${pid} isn't in the registry: onRails didn't start it. Stop it anyway?`))) {
    return fail(log, `Left PID ${pid} alone: onRails didn't start it. Ask the person first. After a yes: ${stopCmd} ${pid} --yes`, 1);
  }
  // Even after a yes: never PID 1, this script, its parent or the agent. stopRecords reads the process list again now
  // that the prompt is closed, and checks this floor again on what it reads, before any signal (#248).
  const rec = { id: `pid ${pid}`, pid, start: p.start, group: false };
  const never = floor(rec, guarded(sys));
  if (never) return fail(log, `Left PID ${pid} alone: ${never}.`, 1);
  const { killed, refused } = await stopRecords(sys, [rec]);
  if (refused.length) return fail(log, `Left PID ${pid} alone: ${refused[0].why}.`, 1);
  log(killed.length ? `Killed PID ${pid} after the grace.` : `Stopped PID ${pid}.`);
  return 0;
}

function pick(seen, target) {
  if (target === "mine") return seen.filter((r) => r.mine);
  if (target === "stale") return seen.filter((r) => r.stale);
  if (target === "all") return seen;
  return seen.filter((r) => r.id === target || String(r.pid) === target);
}

async function stop(sys, log, ctx) {
  const { dir, me, target, flags, ask } = ctx;
  if (!target) return fail(log, "Say what to stop: an id, mine, stale, all, or a PID");
  const seen = survey(sys, dir, me, { prune: true });
  if (!seen) return fail(log, NO_PS, 1);
  const picked = pick(seen, target);
  if (!picked.length && /^\d+$/.test(target)) return stopUnregistered(sys, log, Number(target), ctx);
  if (!picked.length && !["mine", "stale", "all"].includes(target)) return fail(log, `No record ${target}. See them all: ${ctx.listCmd}`, 1);
  // Another session's processes, live or with no agent recorded to tell: only after a yes (issue rule 7).
  // The person at the CLI is asked; an agent must ask them.
  const others = target === "stale" ? [] : picked.filter((r) => !r.mine && r.owner !== "gone");
  const names = others.map((r) => `${r.id} (${r.label})`).join(", ");
  const who = others.every((r) => r.owner === "alive") ? "another live session" : "another session, maybe still live,";
  if (others.length && !flags.yes && !(await yes(ask, `${who[0].toUpperCase()}${who.slice(1)} started ${names}. Stop them too?`))) {
    return fail(log, `Left everything alone: ${who} started ${names}. Ask the person first. After a yes: ${ctx.stopCmd} ${target} --yes`, 1);
  }
  const grace = flags.grace ? Number(flags.grace) : GRACE_S;
  const { stopped, killed, refused } = await stopRecords(sys, picked, { grace });
  forget(sys, [...stopped, ...killed]);
  for (const r of stopped) log(`Stopped ${r.id}: ${r.command}`);
  for (const r of killed) log(`Killed ${r.id} after ${grace} s: ${r.command}`);
  for (const { r, why } of refused) log(`Left ${r.id} alone: ${why}.`);
  if (refused.some((x) => x.why === NO_LIST)) return fail(log, NO_PS, 1);
  // The proof: what's still running. An agent sees its own; the person, from the CLI, sees everything.
  return list(sys, log, { ...ctx, mine: !ctx.cli && !["all", "stale"].includes(target) });
}

function pauseHours(sys, dir) {
  const root = sys.git(dir, ["rev-parse", "--show-toplevel"]) || dir;
  for (const p of [join(root, "docs", "profile.toml"), join(homeDir(sys.home), "profile.toml")]) {
    let text = null;
    try { text = readFileSync(p, "utf8"); } catch { continue; } // no profile there: try the next one
    const body = text.split(/^\[workflow\]\s*$/m)[1]?.split(/^\[/m)[0];
    const n = Number(body?.match(/^\s*pause_hours\s*=\s*([\d.]+)/m)?.[1]);
    if (n > 0) return n;
  }
  return PAUSE_HOURS;
}

// Writes a change to each picked record, in whichever registry holds it. Returns the paths it changed.
function mark(sys, picked, change) {
  const paths = [...new Set(picked.map((r) => r.path))];
  for (const path of paths) update(sys, path, (procs) => procs.map((r) => (picked.some((x) => x.id === r.id && x.path === path) ? { ...r, ...change } : r)));
  return paths;
}

function pause(sys, log, ctx) {
  const { dir, me, args } = ctx;
  const seen = survey(sys, dir, me);
  if (!seen) return fail(log, NO_PS, 1);
  const until = iso(sys.now() + pauseHours(sys, dir) * 60 * MINUTE);
  const picked = seen.filter((r) => r.kind !== "watcher" && (args.length ? args.includes(r.id) : r.mine));
  for (const path of mark(sys, picked, { state: "paused", pausedUntil: until })) ensureWatcher(sys, path, me);
  log(picked.length ? `Paused ${picked.length}. Each stops at ${until} or when this session ends. Resume: ${SCRIPT} resume` : "Nothing of this session's to pause.");
  return list(sys, log, { ...ctx, mine: true });
}

function resume(sys, log, { dir, me }) {
  const seen = survey(sys, dir, me);
  if (!seen) return fail(log, NO_PS, 1);
  const picked = seen.filter((r) => r.mine && r.state === "paused");
  mark(sys, picked, { state: "running", pausedUntil: null });
  log(`Resumed ${picked.length}.`);
  return 0;
}

const VALUE = new Set(["--why", "--until", "--for", "--owner", "--grace", "--registry", "--stop", "--guard"]);
const BOOL = new Set(["--mine", "--json", "--yes"]);

// A value flag given twice is refused, never overwritten: a later copy must not replace --guard, --registry or --grace.
// Everything after -- is a command (start) or ids (reap), never an option.
function parse(argv) {
  const flags = {}, rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") return { flags, rest, command: argv.slice(i + 1) };
    if (VALUE.has(a)) {
      if (argv[i + 1] === undefined) return { error: `${a} needs a value` };
      if (Object.hasOwn(flags, a.slice(2))) return { error: `${a} is given twice` };
      flags[a.slice(2)] = argv[++i];
    } else if (BOOL.has(a)) flags[a.slice(2)] = true;
    else if (a.startsWith("-")) return { error: `Unknown option: ${a}` };
    else rest.push(a);
  }
  return { flags, rest, command: [] };
}

const USAGE = "Usage: procs.mjs start --why \"...\" --until \"...\" [--for <min>] -- <command> | list [--mine] [--json] | stop <id|mine|stale|all|pid> [--yes] | pause [<id>...] | resume | session-start | session-end";

/** Runs one command. sys is the machine, log prints a line, ask(question) asks the person (the CLI passes a terminal). */
export async function main(argv, { sys = realSys(), log = console.log, ask } = {}) {
  const { error, flags, rest, command } = parse(argv);
  if (error) return fail(log, `${error}\n${USAGE}`);
  askAgain(sys); // git's and the ACL reader's answers last one command
  let [cmd, ...args] = rest;
  const cli = cmd === "ps";
  if (cli) [cmd, args] = [flags.stop ? "stop" : "list", [flags.stop]];
  const dir = cli ? resolve(sys.cwd, rest[1] ?? ".") : sys.cwd;
  const path = flags.registry ?? registryPath(sys, dir);
  const me = whoAmI(sys, { owner: flags.owner });
  const ctx = { dir, path, me, flags, args, command, target: args[0], ask, cli, mine: flags.mine, json: flags.json,
    hint: cli ? "npx onrails ps --stop stale" : `${SCRIPT} stop stale`, listCmd: cli ? "npx onrails ps" : `${SCRIPT} list`,
    stopCmd: cli ? "npx onrails ps --stop" : `${SCRIPT} stop` };
  // The watcher and the reaper act on the registry they are given: never one a branch could have written.
  const why = ["watch", "reap"].includes(cmd) && untrusted(sys, path);
  if (why) return fail(log, `The registry can't be used: ${why}`, 1);
  switch (cmd) {
    case "start": return start(sys, log, ctx);
    case "list": return list(sys, log, ctx);
    case "stop": return stop(sys, log, ctx);
    case "pause": return pause(sys, log, ctx);
    case "resume": return resume(sys, log, ctx);
    case "session-start": return sessionStart(sys, log, ctx);
    case "session-end": return sessionEnd(sys, log, ctx);
    case "watch": return watch(sys, path, readGuard(flags.guard));
    case "reap": return reap(sys, path, [...args, ...command], flags.grace ? Number(flags.grace) : GRACE_S, readGuard(flags.guard));
    default: return fail(log, USAGE);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  // A hook must never fail the session, so session-start and session-end always exit 0.
  const hook = ["session-start", "session-end"].includes(process.argv[2]);
  try { process.exitCode = await main(process.argv.slice(2)); } catch (error) {
    if (!hook) throw error;
    console.error(`procs.mjs ${process.argv[2]}: ${error.message}`);
  }
  if (hook) process.exitCode = 0;
}
