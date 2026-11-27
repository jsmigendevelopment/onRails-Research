// What's true about the process registry's records (procs.mjs): who is asking, and for each record whether
// it's alive, whose it is and whether it's stale. No dependencies.
// The master copy is scripts/procs-records.mjs in the kit; sync-skills.mjs copies it next to procs.mjs.
import { randomBytes } from "node:crypto";
import { load, registries, update } from "./procs-store.mjs";

export const MINUTE = 60_000;
export const SCRIPT = "node .agents/skills/ask/scripts/procs.mjs";
export const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

// The agent's own program, run directly or by node. Only a program name counts: a path in a shell's
// command line, such as .claude/worktrees/..., is not the agent.
const AGENT = /^(claude|codex)(\.exe|\.c?js|\.mjs)?$/i;
// A program's file name, from a Linux, macOS or Windows path, quoted or not.
const program = (token) => token.replace(/"/g, "").split(/[\\/]/).pop();
export const isAgent = (args = "") => args.split(/\s+/).slice(0, 2).some((t) => AGENT.test(program(t)))
  || /@anthropic-ai[\\/]claude-code[\\/]|@openai[\\/]codex[\\/]/.test(args);

/** The agent's own process: CLAUDE_PID, or the first claude or codex among this script's parents. */
export function findAgent(sys) {
  const claimed = Number(sys.env.CLAUDE_PID);
  if (Number.isInteger(claimed) && claimed > 1) return claimed;
  const rows = new Map((sys.table() ?? []).map((r) => [r.pid, r]));
  for (let pid = sys.parentPid, i = 0; i < 10 && rows.has(pid); i++, pid = rows.get(pid).ppid) {
    if (isAgent(rows.get(pid).args)) return pid;
  }
  return null;
}

/** Who is asking: the session, the agent's process with its start time (or null) and a label for the list. */
export function whoAmI(sys, { owner, session } = {}) {
  const id = owner || session || sys.env.CLAUDE_CODE_SESSION_ID || null;
  const pid = findAgent(sys);
  const start = pid ? sys.info([pid])?.get(pid)?.start : null;
  const agent = pid && start ? { pid, start } : null;
  return { session: id, agent, label: sys.env.ONRAILS_THREAD || id?.slice(0, 8) || (pid ? `pid ${pid}` : "unknown") };
}

/** The same process: a recorded start time that matches the live one. No start recorded never matches. */
export const sameStart = (want, have) => typeof want === "string" && want !== "" && have?.start === want;
// Session ids decide when both sides have one: one app process can host many sessions. Else the agent's process does.
const isMine = (r, me) => (me.session && r.session ? r.session === me.session
  : Boolean(me.agent && r.agent?.pid === me.agent.pid && r.agent?.start === me.agent.start));
export const past = (when, now) => Boolean(when) && Date.parse(when) <= now;
export const livePids = (recs) => recs.flatMap((r) => [r.pid, r.agent?.pid]).filter(Number.isInteger);

/** Each record with what's true now: alive, its owner's state, mine, and why it's stale (or null). */
export function inspect(recs, live, me, now) {
  return recs.map((r) => {
    const p = live.get(r.pid);
    const alive = Number.isInteger(r.pid) && r.pid > 1 && sameStart(r.start, p);
    const owner = !r.agent?.start ? "unknown" : sameStart(r.agent.start, live.get(r.agent.pid)) ? "alive" : "gone";
    const stale = !alive ? null : owner === "gone" ? "its owner session is gone" : past(r.deadline, now) ? `past its time (${r.until})`
      : r.state === "paused" && past(r.pausedUntil, now) ? "its pause ran out" : null;
    return { ...r, alive, owner, stale, mine: isMine(r, me), cpu: p?.cpu, mem: p?.mem };
  });
}

/**
 * Reads every registry and inspects its live records. null: can't read processes.
 * Only with prune (stop and the session hooks) does it drop the records of processes that have exited:
 * list and doctor never write.
 */
export function survey(sys, dir, me, { prune = false } = {}) {
  const all = registries(sys, dir).map((path) => ({ path, recs: load(path, sys) }));
  const live = sys.info(all.flatMap((x) => livePids(x.recs)));
  if (!live) return null;
  return all.flatMap(({ path, recs }) => {
    const seen = inspect(recs, live, me, sys.now());
    const gone = new Set(seen.filter((r) => !r.alive).map((r) => r.id));
    if (prune && gone.size) update(sys, path, (now) => now.filter((r) => !gone.has(r.id)));
    return seen.filter((r) => r.alive).map((r) => ({ ...r, path }));
  });
}

export function newRecord(sys, me, flags, fields) {
  return {
    id: fields.id, kind: fields.kind ?? "process", pid: fields.pid, group: fields.group, start: fields.start,
    command: fields.command, why: flags.why, until: flags.until, deadline: flags.for ? iso(sys.now() + Number(flags.for) * MINUTE) : null,
    state: "running", pausedUntil: null, session: me.session, agent: me.agent, label: me.label, startedAt: iso(sys.now()), cwd: sys.cwd, log: fields.log ?? null,
  };
}

/** True for an id shaped exactly as newId makes it. Only such ids go on a command line (#174). */
export const isId = (id) => typeof id === "string" && /^p[0-9a-f]{4}$/.test(id);

export function newId(sys, path) {
  const taken = new Set(load(path, sys).map((r) => r.id));
  for (;;) { const id = `p${randomBytes(2).toString("hex")}`; if (!taken.has(id)) return id; }
}

export function age(ms) {
  const m = Math.max(0, Math.floor(ms / MINUTE)), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d ? `${d}d ${h % 24}h` : h ? `${h}h ${m % 60}m` : `${m}m`;
}
