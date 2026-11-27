#!/usr/bin/env node
// The coordinator's one sweep timer. Its state is one line in docs/state.md, so every session
// that opens the repo sees the same timer:
//   Sweep timer: live · <kind> · <id> · every <n> min · next <ISO time, UTC>
//   Sweep timer: none
// A missing line goes right after a "## Loop" heading, or else the first heading.
// No dependencies. Exit 0 means yes or done, 1 means no, 2 means a usage error.
//   node timer.mjs status                         live|dead <id> <kind> <interval> <next>, or none
//   node timer.mjs should-arm                     0: no timer, or dead (past due by more than 3x its interval)
//   node timer.mjs dead-id                        0 and the tool id to cancel, when the recorded timer is dead
//   node timer.mjs armed <kind> <id> <interval>   writes the line; next = now + interval minutes
//   node timer.mjs fired <tag> [kind]             0: the line names this timer (next moves on); 1: stale or duplicate,
//                                                 and for a repeating kind it prints stale-cancel <tag>
//   node timer.mjs interval <10|30>               rewrites the interval only; prints changed or same
//   node timer.mjs cancelled                      writes none
// The supervisor (#206) restarts a loop whose session died. Its line sits under the sweep timer's:
//   Supervisor: live · <kind> · <id> · every 60 min
//   Supervisor: none
//   node timer.mjs supervisor-armed <kind> <id>   writes the live line; 1 and the live id when one is already live
//   node timer.mjs supervisor-cancelled           writes none, once
//   node timer.mjs supervise                      0 restart: supervisor live, sweep timer none or dead;
//                                                 1 alive: sweep timer live; 1 stopped: no live supervisor
// Only those two forms are the script's own. Any other line that starts with "Supervisor:" is the person's: left alone.
// Kinds: send_later and wake-up are one-shots; loop and scheduled-task repeat; foreground is the
// foreground loop. An id is <tag>+<tool id>. The tag is yours and goes in the firing message
// ("Sweep timer fired <tag> <kind>"), because the message is set before the tool returns its own id,
// which you need to cancel the timer.
// --file <path> (default docs/state.md) and --now <ISO time> (for tests) work with every command.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MINUTE = 6e4;
// [ \t], not \s: the match must not eat the blank line above it.
const LINE = /^[ \t]*[-*]?[ \t]*(\*\*)?Sweep timer:(\*\*)?[^\n]*$/m;
const REPEATING = new Set(["loop", "scheduled-task"]);
const LIVE = /Sweep timer:(?:\*\*)?\s*live · (\S+) · (\S+) · every (\d+) min · next (\S+)/;
// "live", alone or with fields, or "none": a garbled own line is still replaced; "Supervisor: ask about the logo" isn't.
const SUP_LINE = /^[ \t]*[-*]?[ \t]*(?:\*\*)?Supervisor:(?:\*\*)?[ \t]*(?:live(?:[ \t]*·[^\n]*)?|none[ \t]*)\r?$/m;
const SUP_LINES = new RegExp(`${SUP_LINE.source}\\n?`, "gm");
const SUP_LIVE = /Supervisor:(?:\*\*)?\s*live · \S+ · (\S+) · every \d+ min/;

/** The timer in a state file's text: { kind, id, interval, next } or null. */
export function parse(text) {
  const m = LIVE.exec(text.match(LINE)?.[0] ?? "");
  return m ? { kind: m[1], id: m[2], interval: Number(m[3]), next: m[4] } : null;
}

/** The line for a timer, or for none. */
export const format = (t) => (t ? `Sweep timer: live · ${t.kind} · ${t.id} · every ${t.interval} min · next ${t.next}` : "Sweep timer: none");

/** The text with its Sweep timer line replaced, or added after the "## Loop" or first heading, never at the end. */
export function withLine(text, timer) {
  const line = format(timer);
  if (!LINE.test(text) && SUP_LINE.test(text)) return text.replace(SUP_LINE, (sup) => `${line}\n${sup}`);
  return place(text, LINE, line);
}

/** The ids on the state file's live Supervisor lines. More than one means duplicates: any live one counts. */
const supervisors = (text) => [...text.matchAll(SUP_LINES)].map((m) => SUP_LIVE.exec(m[0])?.[1]).filter(Boolean);

/** The text with its Supervisor line replaced, or added right under the Sweep timer line, or where that line would go. */
function withSupervisor(text, sup) {
  const line = sup ? `Supervisor: live · ${sup.kind} · ${sup.id} · every 60 min` : "Supervisor: none";
  if (!SUP_LINE.test(text) && LINE.test(text)) return text.replace(LINE, (sweep) => `${sweep}\n${line}`);
  let seen = false;
  // Keeps the first own line and drops later duplicates, so two live lines can't appear.
  const once = text.replace(SUP_LINES, (m) => (seen ? "" : ((seen = true), m)));
  return place(once, SUP_LINE, line);
}

/** The text with the line that matches pattern replaced, or added after the "## Loop" or first heading. */
function place(text, pattern, line) {
  if (pattern.test(text)) return text.replace(pattern, line);
  const heading = /^## Loop\b[^\n]*$/m.exec(text) ?? /^#[^\n]*$/m.exec(text);
  if (!heading) return `${line}\n\n${text}`;
  const end = heading.index + heading[0].length;
  const rest = text.slice(end).replace(/^\n+/, "");
  return `${text.slice(0, end)}\n\n${line}\n${rest ? `\n${rest}` : ""}`;
}

/** True when there's no live timer, or it is past due by more than 3 times its interval. */
export function shouldArm(timer, now) {
  if (!timer) return true;
  const next = Date.parse(timer.next);
  return !Number.isFinite(next) || now - next > 3 * timer.interval * MINUTE;
}

const at = (now, minutes) => new Date(now + minutes * MINUTE).toISOString().replace(/\.\d{3}Z$/, "Z");
const SAFE = /^[A-Za-z0-9_./:+-]+$/;
const tagOf = (id) => id.split("+")[0];
const toolId = (id) => (id.includes("+") ? id.slice(id.indexOf("+") + 1) : id);

/** Runs one command on the state text. Returns { code, out, text } where text is the new file, if it changed. */
export function run(args, text, now) {
  const timer = parse(text);
  const [cmd, ...rest] = args;
  const usage = (out) => ({ code: 2, out });
  switch (cmd) {
    case "status":
      if (!timer) return { code: 0, out: "none" };
      return { code: 0, out: `${shouldArm(timer, now) ? "dead" : "live"} ${timer.id} ${timer.kind} ${timer.interval} ${timer.next}` };
    case "dead-id":
      if (!timer || !shouldArm(timer, now)) return { code: 1, out: timer ? `live ${timer.id}: nothing to cancel` : "none: nothing to cancel" };
      if (timer.kind === "foreground") return { code: 1, out: "dead foreground loop: nothing to cancel" };
      return { code: 0, out: toolId(timer.id) };
    case "should-arm":
      return shouldArm(timer, now) ? { code: 0, out: timer ? "arm: the recorded timer is dead" : "arm: no timer" } : { code: 1, out: `live ${timer.id}: arm nothing` };
    case "armed": {
      const [kind, id, minutes] = rest;
      const interval = Number(minutes);
      if (!kind || !id || !SAFE.test(kind) || !SAFE.test(id) || !Number.isInteger(interval) || interval <= 0) return usage("armed <kind> <id> <interval-min>");
      const next = { kind, id, interval, next: at(now, interval) };
      return { code: 0, out: format(next), text: withLine(text, next) };
    }
    case "fired": {
      const [id, kind] = rest;
      if (!id) return usage("fired <tag> [kind]");
      if (!timer || (timer.id !== id && tagOf(timer.id) !== id)) {
        if (REPEATING.has(kind)) return { code: 1, out: `stale-cancel ${id}` };
        return { code: 1, out: `stale: ${id} isn't the live timer. Do the sweep, arm nothing.` };
      }
      const next = { ...timer, next: at(now, timer.interval) };
      return { code: 0, out: format(next), text: withLine(text, next) };
    }
    case "interval": {
      const interval = Number(rest[0]);
      if (interval !== 10 && interval !== 30) return usage("interval <10|30>");
      if (!timer) return { code: 1, out: "none: no timer to change" };
      if (timer.interval === interval) return { code: 0, out: "same" };
      return { code: 0, out: "changed", text: withLine(text, { ...timer, interval }) };
    }
    case "cancelled":
      return { code: 0, out: "Sweep timer: none", text: withLine(text, null) };
    case "supervisor-armed": {
      const [kind, id] = rest;
      if (!kind || !id || !SAFE.test(kind) || !SAFE.test(id)) return usage("supervisor-armed <kind> <id>");
      const live = supervisors(text);
      if (live.length) return { code: 1, out: `live ${live.join(" ")}: a supervisor is already live. Arm nothing, or cancel it first (supervisor-cancelled).` };
      const next = withSupervisor(text, { kind, id });
      return { code: 0, out: next.match(SUP_LINE)[0], text: next };
    }
    case "supervisor-cancelled":
      return { code: 0, out: "Supervisor: none", text: withSupervisor(text, null) };
    case "supervise":
      if (!supervisors(text).length) return { code: 1, out: "stopped" };
      return shouldArm(timer, now) ? { code: 0, out: "restart" } : { code: 1, out: "alive" };
    default:
      return usage("status | should-arm | dead-id | armed <kind> <id> <interval-min> | fired <tag> [kind] | interval <10|30> | cancelled | supervisor-armed <kind> <id> | supervisor-cancelled | supervise");
  }
}

function main(argv) {
  const args = [];
  let file = "docs/state.md";
  let now = Date.now();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") file = argv[++i];
    else if (argv[i] === "--now") now = Date.parse(argv[++i]);
    else args.push(argv[i]);
  }
  if (!file || !Number.isFinite(now)) return console.error("--file needs a path, --now an ISO time"), 2;
  const path = resolve(file);
  const text = existsSync(path) ? readFileSync(path, "utf8") : "# State\n";
  const r = run(args, text, now);
  if (r.text !== undefined && r.text !== text) writeFileSync(path, r.text);
  (r.code === 2 ? console.error : console.log)(r.code === 2 ? `Usage: timer.mjs ${r.out}` : r.out);
  return r.code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
