// A dossier's stores: sources, claims, measurement runs, data links and the write-up itself.
// The desk and measurement checks are adapted from onRails's check-research.mjs.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readTable } from "./csv.mjs";
import { validDate } from "./dates.mjs";
import { loadSchema, validate } from "./schema.mjs";
import { readJson } from "./store.mjs";

export const LABELS = ["measured", "read-in-source", "vendor-claim", "anecdote", "summary-only"];
export const SOURCE_COLUMNS = ["id", "title", "location", "accessed", "read"];
export const CLAIM_COLUMNS = ["id", "claim", "label", "sources", "date"];
export const RESULT_COLUMNS = ["run", "machine", "case", "metric", "unit", "iteration", "phase", "value", "status"];
const MANIFEST_FIELDS = ["run", "created", "question", "machine", "command", "cases", "metrics"];
const HEADINGS = ["## The question", "## Summary", "## Evidence", "## Fact-check"];
const KIND_RULES = {
  comparison: { files: ["coverage.md"], headings: ["## Options compared", "## Recommendation"] },
  "how-to": { files: [], headings: ["## Steps", "## Check it worked"] },
  trap: { files: [], headings: ["## The trap", "## The fix"] },
  benchmark: { files: [], headings: ["## What was measured", "## Results"], stores: ["measurements"] },
  dataset: { files: ["data.json"], headings: ["## What is in it", "## How it was made"] },
};

function uniqueIds(rows, where, problems) {
  const seen = new Set();
  for (const row of rows) {
    if (!row.id) problems.error(`${where}:${row.line}`, "id is empty");
    else if (seen.has(row.id)) problems.error(`${where}:${row.line}`, `id ${row.id} is used twice`);
    seen.add(row.id);
  }
  return seen;
}

function checkSources(dir, id, problems) {
  const where = `${id}/sources.csv`;
  const rows = readTable(join(dir, "sources.csv"), SOURCE_COLUMNS, problems, where) ?? [];
  if (!rows.length) problems.error(where, "no sources: every claim has a source");
  for (const row of rows) {
    const at = `${where}:${row.line}`;
    if (!row.title) problems.error(at, "title is empty");
    if (!row.location) problems.error(at, "location is empty: a URL, a repo path with a commit, or search: <the query>");
    if (!validDate(row.accessed)) problems.error(at, "accessed must be YYYY-MM-DD");
    if (!["full", "skimmed"].includes(row.read)) problems.error(at, "read must be full or skimmed");
  }
  return uniqueIds(rows, where, problems);
}

function checkClaims(dir, id, sources, problems) {
  const where = `${id}/claims.csv`;
  const rows = readTable(join(dir, "claims.csv"), CLAIM_COLUMNS, problems, where) ?? [];
  if (!rows.length) problems.error(where, "no claims: list every concrete claim the dossier makes");
  const runs = existsSync(join(dir, "runs")) ? new Set(readdirSync(join(dir, "runs"))) : new Set();
  uniqueIds(rows, where, problems);
  for (const row of rows) {
    const at = `${where}:${row.line}`;
    if (!row.claim) problems.error(at, "claim is empty");
    if (!LABELS.includes(row.label)) problems.error(at, `label must be one of ${LABELS.join(", ")}`);
    if (!validDate(row.date)) problems.error(at, "date must be YYYY-MM-DD");
    const ids = row.sources.split(";").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) problems.error(at, "a claim needs at least one source id");
    for (const ref of ids) {
      const known = ref.startsWith("run:") ? runs.has(ref.slice(4)) : sources.has(ref);
      if (!known) problems.error(at, `source ${ref} is not in sources.csv${ref.startsWith("run:") ? " or runs/" : ""}`);
    }
    if (row.label === "measured" && !ids.some((ref) => ref.startsWith("run:") || sources.has(ref))) problems.error(at, "a measured claim names its run (run:<run-id>) or the source that holds the numbers");
  }
}

function checkRun(runsDir, run, where, problems) {
  if (!existsSync(join(runsDir, run, "manifest.json"))) return problems.error(where, "manifest.json is missing (write it before the data)");
  const manifest = readJson(join(runsDir, run, "manifest.json"), problems, `${where}/manifest.json`);
  const missing = manifest ? MANIFEST_FIELDS.filter((f) => manifest[f] === undefined || manifest[f] === "") : [];
  if (missing.length) problems.error(`${where}/manifest.json`, `missing ${missing.join(", ")}`);
  if (manifest && manifest.run !== run) problems.error(`${where}/manifest.json`, `run must be "${run}"`);
  if (!existsSync(join(runsDir, run, "results.csv"))) return;
  for (const row of readTable(join(runsDir, run, "results.csv"), RESULT_COLUMNS, problems, `${where}/results.csv`) ?? []) {
    const at = `${where}/results.csv:${row.line}`;
    if (row.run !== run) problems.error(at, `run must be ${run}`);
    if (!["warmup", "measure"].includes(row.phase)) problems.error(at, "phase must be warmup or measure");
    if (!["ok", "failed"].includes(row.status)) problems.error(at, "status must be ok or failed");
    if (row.status === "ok" && !Number.isFinite(Number(row.value))) problems.error(at, "an ok row needs a number in value");
  }
}

function checkMeasurements(dir, id, problems) {
  const runsDir = join(dir, "runs");
  const runs = existsSync(runsDir) ? readdirSync(runsDir).filter((n) => statSync(join(runsDir, n)).isDirectory()) : [];
  if (!runs.length) return problems.error(id, "the measurements store has no run folder in runs/");
  for (const run of runs) checkRun(runsDir, run, `${id}/runs/${run}`, problems);
}

function checkData(root, dir, id, problems) {
  const where = `${id}/data.json`;
  const data = readJson(join(dir, "data.json"), problems, where);
  if (!data) return;
  validate(data, loadSchema(root, "data"), where, problems.error);
  const names = new Set();
  for (const resource of data.resources ?? []) {
    if (names.has(resource.name)) problems.error(where, `resource "${resource.name}" is listed twice`);
    names.add(resource.name);
    if (!(resource.bytes > 0)) problems.error(where, `resource "${resource.name}": bytes must be the file's size`);
  }
}

function checkWriteUp(dir, id, card, problems) {
  const where = `${id}/README.md`;
  if (!existsSync(join(dir, "README.md"))) return problems.error(where, "missing: the findings go in README.md");
  const text = readFileSync(join(dir, "README.md"), "utf8");
  const lines = new Set(text.split(/\r?\n/).map((l) => l.trim()));
  if (!/^# \S/.test(text)) problems.error(where, "must start with a title: # <title>");
  for (const heading of [...HEADINGS, ...(KIND_RULES[card?.tags?.kind]?.headings ?? [])])
    if (!lines.has(heading)) problems.error(where, `missing the section "${heading}"`);
  if (/TODO|<[A-Za-z][^<>\n]*>/.test(text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "")))
    problems.error(where, "still has a TODO or a <placeholder> from the template (code spans are fine)");
}

/** Checks everything in a dossier folder except the card and the provenance record. */
export function checkStores(root, dir, id, card, record, problems) {
  const kind = KIND_RULES[card?.tags?.kind] ?? { files: [] };
  const needed = ["hypotheses.md", "sources.csv", "claims.csv", ...kind.files];
  const missing = needed.filter((f) => !existsSync(join(dir, f)));
  if (missing.length) problems.error(id, `missing ${missing.join(", ")}`);
  if (existsSync(join(dir, "sources.csv")) && existsSync(join(dir, "claims.csv"))) checkClaims(dir, id, checkSources(dir, id, problems), problems);
  const stores = record?.stores ?? [];
  for (const store of kind.stores ?? []) if (!stores.includes(store)) problems.error(`${id}/provenance.json`, `a ${card.tags.kind} dossier needs the "${store}" store`);
  if (stores.includes("measurements")) checkMeasurements(dir, id, problems);
  if (existsSync(join(dir, "data.json"))) checkData(root, dir, id, problems);
  checkWriteUp(dir, id, card, problems);
}
