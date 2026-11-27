#!/usr/bin/env node
// Checks a research folder against the research standard (the research skill):
// the index against the files, each dossier's provenance.json, the desk-research and
// measurement stores, claim labels, re-check dates, and (with --base) the append-only rule.
// No dependencies. The master is scripts/check-research.mjs in the kit; sync-skills copies it.
// Usage:  node check-research.mjs <dir>                 errors fail, stale dossiers warn
//         node check-research.mjs <dir> --base <ref>    also check append-only files against the merge base
//         node check-research.mjs <dir> --stale         only list the dossiers due for a re-check
//         --today YYYY-MM-DD sets the date (for tests)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA = "research-provenance/1";
export const ROLES = ["author", "helper", "fact-check", "reviewer"];
export const ROLE_FIELDS = ["model", "effort", "harness", "started", "finished", "brief"];
export const EFFORTS = ["minimal", "low", "medium", "high", "xhigh", "max", "unknown"];
export const STATUSES = ["draft", "current", "stale", "superseded"];
export const LABELS = ["measured", "read-in-source", "vendor-claim", "anecdote", "summary-only"];
export const DISPOSITIONS = ["fixed", "disputed", "accepted"];
export const INDEX_COLUMNS = ["dossier", "question", "decision", "date", "status", "re-check", "author model · effort"];
export const CSV_COLUMNS = {
  sources: ["id", "title", "location", "accessed", "read"],
  claims: ["id", "claim", "label", "sources", "date"],
  disposition: ["finding", "claim", "disposition", "reason"],
  results: ["run", "machine", "case", "metric", "unit", "iteration", "phase", "value", "status"],
};
export const MANIFEST_FIELDS = ["run", "created", "question", "machine", "command", "cases", "metrics"];
const DESK_FILES = ["hypotheses.md", "coverage.md", "sources.csv", "claims.csv"];
const MODEL_ID = /^[a-z0-9][a-z0-9._:/@-]*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RECHECK_MONTHS = 6;

// A small RFC 4180 reader: quoted fields, doubled quotes, commas and newlines inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

const cells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

// The index table: the first Markdown table whose header names the index columns.
export function parseIndex(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().startsWith("|") && cells(l)[0].toLowerCase() === "dossier");
  if (start < 0) return null;
  const header = cells(lines[start]).map((c) => c.toLowerCase());
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].trim().startsWith("|"); i++) {
    const values = cells(lines[i]);
    rows.push({ line: i + 1, ...Object.fromEntries(header.map((name, n) => [name, values[n] ?? ""])) });
  }
  return { header, rows };
}

const validDate = (s) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const dayOf = (s) => (typeof s === "string" ? s.slice(0, 10) : "");
const knownDate = (s) => s !== "unknown" && validDate(dayOf(s));
function addMonths(day, months) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function readJsonFile(path, problems, label) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (err) { problems.error(label, `not valid JSON (${err.message})`); return null; }
}

function checkCsv(path, columns, problems, label) {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const header = rows[0] ?? [];
  if (header.join(",") !== columns.join(",")) {
    problems.error(label, `columns must be exactly: ${columns.join(",")}`);
    return [];
  }
  return rows.slice(1).map((r, n) => ({ line: n + 2, ...Object.fromEntries(columns.map((c, i) => [c, (r[i] ?? "").trim()])) }));
}

function checkRole(entry, n, base, problems, label) {
  const where = `${label} roles[${n}]`;
  if (!ROLES.includes(entry.role)) problems.error(where, `role must be one of ${ROLES.join(", ")}`);
  for (const field of ROLE_FIELDS) {
    if (typeof entry[field] !== "string" || !entry[field].trim()) problems.error(where, `${field} is missing (write "unknown" if nobody recorded it)`);
  }
  if (typeof entry.model === "string" && entry.model !== "unknown" && !MODEL_ID.test(entry.model)) {
    problems.error(where, `model "${entry.model}" is not an exact model ID (lowercase, no spaces), or "unknown"`);
  }
  if (typeof entry.effort === "string" && !EFFORTS.includes(entry.effort)) problems.error(where, `effort must be one of ${EFFORTS.join(", ")}`);
  for (const field of ["started", "finished"]) {
    if (typeof entry[field] === "string" && entry[field] !== "unknown" && !validDate(dayOf(entry[field]))) problems.error(where, `${field} must be a date (YYYY-MM-DD) or "unknown"`);
  }
  if (knownDate(entry.started) && knownDate(entry.finished) && dayOf(entry.finished) < dayOf(entry.started)) problems.error(where, "finished is before started");
  if (typeof entry.brief === "string" && entry.brief !== "unknown" && !existsSync(join(base, entry.brief.split("#")[0]))) problems.error(where, `brief ${entry.brief} not found`);
  if (entry.requested) {
    const differs = entry.requested.model !== entry.model || entry.requested.effort !== entry.effort;
    if (!entry.requested.model || !entry.requested.effort) problems.error(where, "requested needs model and effort");
    else if (differs && !entry.notes) problems.error(where, "requested and actual model or effort differ: say why in notes (a fallback, a lower effort)");
  }
}

function checkDisposition(entry, base, problems, label) {
  if (typeof entry.disposition !== "string" || !entry.disposition) {
    problems.error(label, "the fact-check entry needs disposition: the file where each finding is fixed, disputed or accepted");
    return;
  }
  const path = join(base, entry.disposition.split("#")[0]);
  if (!existsSync(path)) return problems.error(label, `disposition ${entry.disposition} not found`);
  if (!path.endsWith(".csv")) return;
  for (const row of checkCsv(path, CSV_COLUMNS.disposition, problems, entry.disposition)) {
    if (!DISPOSITIONS.includes(row.disposition)) problems.error(`${entry.disposition}:${row.line}`, `disposition must be one of ${DISPOSITIONS.join(", ")}`);
    if (!row.reason) problems.error(`${entry.disposition}:${row.line}`, "every finding needs a reason");
  }
}

function checkDesk(store, problems, label) {
  const missing = DESK_FILES.filter((f) => !existsSync(join(store, f)));
  if (missing.length) return problems.error(label, `desk store is missing ${missing.join(", ")}`);
  const sources = new Set(checkCsv(join(store, "sources.csv"), CSV_COLUMNS.sources, problems, `${label}/sources.csv`).map((s) => s.id));
  const runs = existsSync(join(store, "runs")) ? new Set(readdirSync(join(store, "runs"))) : new Set();
  for (const claim of checkCsv(join(store, "claims.csv"), CSV_COLUMNS.claims, problems, `${label}/claims.csv`)) {
    const where = `${label}/claims.csv:${claim.line}`;
    if (!LABELS.includes(claim.label)) problems.error(where, `label must be one of ${LABELS.join(", ")}`);
    const ids = claim.sources.split(";").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) problems.error(where, "a claim needs at least one source id");
    for (const id of ids) {
      const known = id.startsWith("run:") ? runs.has(id.slice(4)) : sources.has(id);
      if (!known) problems.error(where, `source ${id} is not in sources.csv${id.startsWith("run:") ? " or runs/" : ""}`);
    }
  }
}

function checkMeasurements(store, problems, label) {
  const runsDir = join(store, "runs");
  const runs = existsSync(runsDir) ? readdirSync(runsDir).filter((n) => statSync(join(runsDir, n)).isDirectory()) : [];
  if (!runs.length) return problems.error(label, "measurement store has no run folder in runs/");
  const machines = new Set();
  for (const run of runs) {
    const where = `${label}/runs/${run}`;
    if (!existsSync(join(runsDir, run, "manifest.json"))) { problems.error(where, "manifest.json is missing (write it before the data)"); continue; }
    const manifest = readJsonFile(join(runsDir, run, "manifest.json"), problems, `${where}/manifest.json`);
    const missing = manifest ? MANIFEST_FIELDS.filter((f) => manifest[f] === undefined || manifest[f] === "") : [];
    if (missing.length) problems.error(`${where}/manifest.json`, `missing ${missing.join(", ")}`);
    if (!existsSync(join(runsDir, run, "results.csv"))) continue;
    for (const row of checkCsv(join(runsDir, run, "results.csv"), CSV_COLUMNS.results, problems, `${where}/results.csv`)) {
      const at = `${where}/results.csv:${row.line}`;
      if (row.run !== run) problems.error(at, `run must be ${run}`);
      if (!["warmup", "measure"].includes(row.phase)) problems.error(at, "phase must be warmup or measure");
      if (!["ok", "failed"].includes(row.status)) problems.error(at, "status must be ok or failed");
      if (row.status === "ok" && !Number.isFinite(Number(row.value))) problems.error(at, "an ok row needs a number in value");
      machines.add(row.machine);
    }
  }
  for (const machine of machines) {
    if (!existsSync(join(store, "summaries", `${machine}.md`))) problems.warn(label, `no summary for machine ${machine} (summaries/${machine}.md)`);
  }
}

function checkProvenance(dir, topic, row, problems) {
  const label = `${topic}/provenance.json`;
  const store = join(dir, topic);
  if (!existsSync(join(store, "provenance.json"))) return problems.error(label, "missing: every dossier needs one");
  const record = readJsonFile(join(store, "provenance.json"), problems, label);
  if (!record) return;
  if (record.schema !== SCHEMA) problems.error(label, `schema must be "${SCHEMA}"`);
  if (record.dossier !== `${topic}.md`) problems.error(label, `dossier must be "${topic}.md"`);
  if (!Array.isArray(record.stores)) problems.error(label, 'stores must be a list: [], ["desk"], ["measurements"] or both');
  const roles = Array.isArray(record.roles) ? record.roles : [];
  if (!roles.length) return problems.error(label, "roles must list at least the author");
  roles.forEach((entry, n) => checkRole(entry, n, store, problems, label));
  const author = roles.find((r) => r.role === "author");
  const checks = roles.filter((r) => r.role === "fact-check");
  if (!author) problems.error(label, "no author entry");
  const status = row?.status.split(/\s/)[0].toLowerCase();
  if (!checks.length && ["current", "stale"].includes(status)) problems.error(label, `no fact-check entry, so the dossier can't be ${status}: mark it draft`);
  for (const entry of checks) {
    checkDisposition(entry, store, problems, label);
    if (author && entry.model !== "unknown" && entry.model === author.model) problems.warn(label, "the fact-check ran on the author's model; use another model when you have one");
  }
  if ((record.stores ?? []).includes("desk")) checkDesk(store, problems, topic);
  if ((record.stores ?? []).includes("measurements")) checkMeasurements(store, problems, topic);
  if (author && row) checkAgainstIndex(author, row, problems);
}

function checkAgainstIndex(author, row, problems) {
  const where = `README.md:${row.line}`;
  const [model, effort] = row["author model · effort"].replaceAll("`", "").split("·").map((s) => s.trim());
  if (model !== author.model || effort !== author.effort) problems.error(where, `Author model · effort must be "${author.model} · ${author.effort}", as in provenance.json`);
  if (knownDate(author.finished) && row.date !== dayOf(author.finished)) problems.error(where, `Date must be ${dayOf(author.finished)}, the author's finished date`);
}

function checkRow(row, dir, today, problems, result) {
  const where = `README.md:${row.line}`;
  const link = row.dossier.match(/\]\(([^)#]+\.md)\)/);
  if (!link || link[1].includes("/")) { problems.error(where, "Dossier must link a file in this folder: [Title](topic.md)"); return null; }
  if (!existsSync(join(dir, link[1]))) problems.error(where, `${link[1]} not found`);
  if (!row.question) problems.error(where, "Question is empty");
  if (!row.decision) problems.error(where, 'Decision is empty (write "none yet" if nothing rests on it)');
  for (const [, target] of row.decision.matchAll(/\]\(([^)#]+)(#[^)]*)?\)/g)) {
    if (!/^[a-z]+:/.test(target) && !existsSync(join(dir, target))) problems.error(where, `Decision links ${target}, which is not found`);
  }
  if (!validDate(row.date)) problems.error(where, "Date must be YYYY-MM-DD");
  const status = row.status.split(/\s/)[0].toLowerCase();
  if (!STATUSES.includes(status)) problems.error(where, `Status must start with one of ${STATUSES.join(", ")}`);
  if (status === "superseded" && row.status.trim().split(/\s+/).length < 3) problems.error(where, "Status says what superseded it: superseded by <what>");
  const recheck = row["re-check"];
  if (status === "superseded") return link[1].slice(0, -3);
  if (!validDate(recheck)) problems.error(where, "Re-check must be YYYY-MM-DD");
  else if (validDate(row.date)) {
    if (recheck <= row.date) problems.error(where, "Re-check must be after Date");
    else if (recheck > addMonths(row.date, MAX_RECHECK_MONTHS)) problems.warn(where, `Re-check is more than ${MAX_RECHECK_MONTHS} months after Date`);
    if (status === "stale" || recheck <= today) result.stale.push({ dossier: link[1], recheck, status });
  }
  return link[1].slice(0, -3);
}

/** Checks a research folder. Returns { errors, warnings, stale, dossiers }; each problem is "where: message". */
export function checkResearch(dir, { today = new Date().toISOString().slice(0, 10), base } = {}) {
  const result = { errors: [], warnings: [], stale: [], dossiers: 0 };
  const problems = {
    error: (where, msg) => result.errors.push(`${where}: ${msg}`),
    warn: (where, msg) => result.warnings.push(`${where}: ${msg}`),
  };
  const indexPath = join(dir, "README.md");
  if (!existsSync(indexPath)) { problems.error("README.md", "missing: the index lists every dossier"); return result; }
  const index = parseIndex(readFileSync(indexPath, "utf8"));
  if (!index) { problems.error("README.md", `no index table (columns: ${INDEX_COLUMNS.join(" | ")})`); return result; }
  const missingCols = INDEX_COLUMNS.filter((c) => !index.header.includes(c));
  if (missingCols.length) { problems.error("README.md", `the index table is missing columns: ${missingCols.join(", ")}`); return result; }
  const listed = new Map();
  for (const row of index.rows) {
    const topic = checkRow(row, dir, today, problems, result);
    if (!topic) continue;
    if (listed.has(topic)) problems.error(`README.md:${row.line}`, `${topic}.md is listed twice`);
    listed.set(topic, row);
  }
  const files = readdirSync(dir).filter((n) => n.endsWith(".md") && n !== "README.md" && statSync(join(dir, n)).isFile());
  for (const file of files) if (!listed.has(file.slice(0, -3))) problems.error(file, "not in the index (README.md)");
  for (const [topic, row] of listed) if (existsSync(join(dir, `${topic}.md`))) checkProvenance(dir, topic, row, problems);
  result.dossiers = listed.size;
  if (base) checkAppendOnly(dir, base, problems);
  return result;
}

/** The dossiers due for a re-check, or [] when the folder has no readable index. */
export function staleDossiers(dir, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const indexPath = join(dir, "README.md");
  if (!existsSync(indexPath)) return [];
  const result = { stale: [] };
  const quiet = { error() {}, warn() {} };
  for (const row of parseIndex(readFileSync(indexPath, "utf8"))?.rows ?? []) checkRow(row, dir, today, quiet, result);
  return result.stale;
}

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const appendOnly = (path) => /(^|\/)(sources|claims)\.csv$/.test(path) || /(^|\/)runs\//.test(path);

// sources.csv and claims.csv only grow; files in runs/ never change or go away.
function checkAppendOnly(dir, base, problems) {
  let root, mergeBase;
  try {
    root = git(["rev-parse", "--show-toplevel"], dir).trim();
    mergeBase = git(["merge-base", base, "HEAD"], dir).trim();
  } catch (err) { return problems.error("--base", `git could not find the merge base with ${base} (${err.message.split("\n")[0]})`); }
  const prefix = relative(root, resolve(dir)).split(sep).join("/");
  const listed = git(["ls-tree", "-r", "--name-only", mergeBase, "--", prefix || "."], root).split("\n").filter(Boolean);
  for (const path of listed.filter(appendOnly)) {
    const where = relative(resolve(dir), join(root, path)).split(sep).join("/");
    const now = join(root, path);
    if (!existsSync(now)) { problems.error(where, `deleted, but it is append-only (it exists at ${mergeBase.slice(0, 7)})`); continue; }
    const before = git(["show", `${mergeBase}:${path}`], root).replace(/\r\n/g, "\n");
    const after = readFileSync(now, "utf8").replace(/\r\n/g, "\n");
    const grows = !/(^|\/)runs\//.test(path); // sources.csv and claims.csv may grow at the end
    if (grows ? !after.startsWith(before) : after !== before) {
      problems.error(where, `changed, but it is append-only: add rows at the end, or a new run folder (base ${mergeBase.slice(0, 7)})`);
    }
  }
}

function main(argv) {
  const args = argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const today = opt("--today"), base = opt("--base");
  const staleOnly = args.includes("--stale");
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) { console.error("Usage: node check-research.mjs <research dir> [--base <git ref>] [--stale] [--today YYYY-MM-DD]"); return 2; }
  if (!existsSync(dir)) { console.log(`No research folder at ${dir}: nothing to check.`); return 0; }
  if (staleOnly) {
    const stale = staleDossiers(dir, { today });
    for (const s of stale) console.log(`stale: ${s.dossier} (re-check ${s.recheck})`);
    if (!stale.length) console.log("No stale dossiers.");
    return 0;
  }
  const r = checkResearch(dir, { today, base });
  for (const e of r.errors) console.error(`error: ${e}`);
  for (const w of r.warnings) console.log(`warn:  ${w}`);
  for (const s of r.stale) console.log(`stale: ${s.dossier} (re-check ${s.recheck})`);
  console.log(`research: ${r.dossiers} dossiers, ${r.errors.length} errors, ${r.warnings.length} warnings, ${r.stale.length} stale`);
  return r.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
