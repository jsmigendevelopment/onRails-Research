// The scale run: builds synthetic commons of 10, 1,000 and 10,000 dossiers and times the checker and
// the index builder on each. Writes results.csv rows to stdout. See manifest.json for the design.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RUN = "2026-11-24-scale", MACHINE = "cloud-linux-4cpu";
const REPO = resolve(fileURLToPath(import.meta.url), "../../../../../../..");
const { addDossier, commit, makeCommons, sh } = await import(join(REPO, "scripts/test/helpers.mjs"));
const node = process.execPath;
const CASES = [["n10", 10], ["n1000", 1000], ["n10000", 10000]];
const WARMUP = 1, ITERATIONS = 3;

let seed = 1729;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (list) => list[Math.floor(random() * list.length)];
const tagIds = (facet) => JSON.parse(readFileSync(join(REPO, "tags", `${facet}.json`), "utf8")).values.map((v) => v.id);
const DOMAINS = tagIds("domain"), TOPICS = tagIds("topic"), KINDS = ["comparison"], STACKS = tagIds("stack");

function dayOf(i, n) {
  const start = Date.UTC(2026, 0, 1), span = Date.UTC(2030, 11, 31) - start;
  return new Date(start + Math.floor((span * i) / Math.max(n - 1, 1))).toISOString().slice(0, 10);
}

/** n copies of one filled-in dossier, each with its own id, date and tags. */
function build(n) {
  const root = makeCommons();
  const model = addDossier(root, { slug: "model", date: "2026-01-01" });
  const template = model.dir;
  for (let i = 1; i < n; i++) {
    const date = dayOf(i, n), id = `${date}-synthetic-${i}`;
    const dir = join(root, "dossiers", date.slice(0, 4), date.slice(5, 7), id);
    cpSync(template, dir, { recursive: true });
    const card = JSON.parse(readFileSync(join(dir, "dossier.json"), "utf8"));
    Object.assign(card, { id, created: date, checked: date, recheck: new Date(Date.parse(date) + 182 * 864e5).toISOString().slice(0, 10) });
    card.history[0].date = date;
    card.tags = { domain: [pick(DOMAINS)], topic: [pick(TOPICS)], kind: pick(KINDS), stack: random() < 0.5 ? [pick(STACKS)] : [] };
    writeFileSync(join(dir, "dossier.json"), JSON.stringify(card, null, 2) + "\n");
    const record = JSON.parse(readFileSync(join(dir, "provenance.json"), "utf8"));
    for (const role of record.roles) { role.started = date; role.finished = date; }
    writeFileSync(join(dir, "provenance.json"), JSON.stringify(record, null, 2) + "\n");
    for (const f of ["sources.csv", "claims.csv"]) writeFileSync(join(dir, f), readFileSync(join(dir, f), "utf8").replaceAll("2026-11-24", date));
  }
  commit(root, "synthetic commons");
  return root;
}

function time(args, cwd) {
  const start = process.hrtime.bigint();
  let status = "ok";
  try { execFileSync(node, args, { cwd, stdio: "ignore", env: { ...process.env, PRIVATE_TERMS: "" } }); }
  catch { status = "failed"; }
  return { ms: Number(process.hrtime.bigint() - start) / 1e6, status };
}

function walkSizes(dir, acc = { bytes: 0, maxEntries: 0 }) {
  const names = readdirSync(dir);
  acc.maxEntries = Math.max(acc.maxEntries, names.length);
  for (const name of names) {
    const p = join(dir, name), s = statSync(p);
    if (s.isDirectory()) walkSizes(p, acc);
    else acc.bytes += s.size;
  }
  return acc;
}

function largestMd(dir) {
  let max = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name), s = statSync(p);
    if (s.isDirectory()) max = Math.max(max, largestMd(p));
    else if (name.endsWith(".md")) max = Math.max(max, s.size);
  }
  return max;
}

const rows = ["run,machine,case,metric,unit,iteration,phase,value,status"];
const row = (kase, metric, unit, iteration, phase, value, status) => rows.push([RUN, MACHINE, kase, metric, unit, iteration, phase, value, status].join(","));

for (const [kase, n] of CASES) {
  const root = build(n);
  cpSync(join(REPO, "scripts"), join(root, "scripts"), { recursive: true });
  sh(root, "checkout", "-q", "-b", "pr");
  addDossier(root, { slug: "the-new-one", date: "2030-12-31" });
  const out = mkdtempSync(join(tmpdir(), "scale-index-"));
  const jobs = [
    ["check_all", ["scripts/check.mjs", "--all", "--today", "2026-11-24"]],
    ["check_pr", ["scripts/check.mjs", "--base", "main", "--today", "2026-11-24"]],
    ["build_index", ["scripts/build-index.mjs", "--out", out, "--today", "2026-11-24"]],
  ];
  for (let i = 1; i <= WARMUP + ITERATIONS; i++) {
    const phase = i <= WARMUP ? "warmup" : "measure", iteration = i <= WARMUP ? i : i - WARMUP;
    for (const [metric, args] of jobs) {
      const { ms, status } = time(args, root);
      row(kase, metric, "ms", iteration, phase, ms.toFixed(1), status);
    }
  }
  const sizes = walkSizes(join(root, "dossiers"));
  row(kase, "store_bytes", "bytes", 1, "measure", sizes.bytes, "ok");
  row(kase, "largest_folder_entries", "entries", 1, "measure", sizes.maxEntries, "ok");
  row(kase, "index_json_bytes", "bytes", 1, "measure", statSync(join(out, "index.json")).size, "ok");
  row(kase, "largest_page_bytes", "bytes", 1, "measure", largestMd(out), "ok");
  rmSync(root, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
}
console.log(rows.join("\n"));
