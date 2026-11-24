#!/usr/bin/env node
// Builds the browsable index from every dossier's card and provenance. No dependencies.
//
//   node scripts/build-index.mjs --out <dir> [--repo owner/name] [--branch main] [--today YYYY-MM-DD]
//
// Writes <dir>/README.md (the front page), one page per tag value (<facet>/<value>.md, split by year
// past PAGE_ROWS rows), stale.md, changes.md and index.json. Freshness is worked out here, from today's
// date: nobody writes "stale" by hand. The pages link to the dossiers on <branch> of <repo>.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addMonths, today as now } from "./lib/dates.mjs";
import { trustOf } from "./lib/provenance.mjs";
import { CARD, collector, FACETS, listDossiers } from "./lib/store.mjs";
import { liveTag, loadTags } from "./lib/tags.mjs";

export const PAGE_ROWS = 300;
const SOON_DAYS = 30;
const RECENT = 20;

/** fresh, due-soon, stale, superseded or retracted. */
export function freshnessOf(card, today) {
  if (card.status !== "current") return card.status;
  if (!card.recheck || card.recheck <= today) return "stale";
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + SOON_DAYS);
  return card.recheck <= soon.toISOString().slice(0, 10) ? "due-soon" : "fresh";
}

const read = (path) => { try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; } };

/** Every dossier as one index entry, newest first. Folders without a readable card are skipped. */
export function collect(root, today) {
  const entries = [];
  for (const { id, rel, dir } of listDossiers(root)) {
    const card = read(join(dir, CARD));
    if (!card) continue;
    const record = read(join(dir, "provenance.json"));
    const author = record?.roles?.find((r) => r.role === "author");
    entries.push({
      id, path: rel, title: card.title, question: card.question, summary: card.summary, tags: card.tags,
      status: card.status, freshness: freshnessOf(card, today), trust: trustOf(record),
      created: card.created, checked: card.checked, recheck: card.recheck, version: card.version,
      superseded_by: card.superseded_by, retraction: card.retraction,
      author: author ? { model: author.model, effort: author.effort } : null,
    });
  }
  return entries.sort((a, b) => (a.created === b.created ? a.id.localeCompare(b.id) : b.created.localeCompare(a.created)));
}

const LABEL = { fresh: "fresh", "due-soon": "due soon", stale: "stale", superseded: "superseded", retracted: "retracted" };
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");

function state(e) {
  if (e.freshness === "stale") return `**stale**: re-check was due ${e.recheck}`;
  if (e.freshness === "superseded") return `superseded by \`${e.superseded_by}\``;
  if (e.freshness === "retracted") return `**retracted** ${e.retraction?.date ?? ""}`;
  return `${LABEL[e.freshness]} until ${e.recheck}`;
}

function table(entries, link) {
  if (!entries.length) return "_No dossiers yet._\n";
  const rows = entries.map((e) => `| [${esc(e.title)}](${link(e)}) | ${e.tags.kind} | ${state(e)} | ${e.trust} | ${e.checked} |`);
  return ["| Dossier | Kind | Freshness | Checked by | Last checked |", "|---|---|---|---|---|", ...rows].join("\n") + "\n";
}

function tagPages(entries, lists, link, out) {
  const pages = [];
  for (const facet of FACETS) {
    for (const [value, tag] of lists[facet]) {
      if (tag.use_instead) continue;
      const pick = entries.filter((e) => [e.tags[facet]].flat().some((v) => liveTag(lists[facet], v) === value));
      const merged = [...lists[facet].values()].filter((t) => t.use_instead === value).map((t) => `\`${t.id}\``);
      const head = `# ${tag.label}\n\n${tag.means}\n\n${pick.length} dossier${pick.length === 1 ? "" : "s"} tagged \`${facet}: ${value}\`${merged.length ? ` (also ${merged.join(", ")}, now merged into it)` : ""}.${tag.retired ? ` This value was retired on ${tag.retired}.` : ""} [All tags](../README.md)\n\n`;
      const file = `${facet}/${value}.md`;
      if (pick.length <= PAGE_ROWS) writePage(out, file, head + table(pick, (e) => link(e, 1)));
      else {
        const years = [...new Set(pick.map((e) => e.created.slice(0, 4)))];
        writePage(out, file, head + years.map((y) => `- [${y}](${value}/${y}.md): ${pick.filter((e) => e.created.startsWith(y)).length} dossiers`).join("\n") + "\n");
        for (const y of years) writePage(out, `${facet}/${value}/${y}.md`, `# ${tag.label}: ${y}\n\n[All years](../${value}.md)\n\n` + table(pick.filter((e) => e.created.startsWith(y)), (e) => link(e, 2)));
      }
      pages.push({ facet, value, label: tag.label, count: pick.length, file, retired: Boolean(tag.retired) });
    }
  }
  return pages;
}

function front(entries, pages, link, today) {
  const count = (f) => entries.filter((e) => e.freshness === f).length;
  const facetList = (facet) => pages.filter((p) => p.facet === facet && (p.count || !p.retired)).map((p) => `[${p.label}](${p.file}) (${p.count})`).join(" · ");
  return [
    "# The index",
    "",
    `Built ${today} from ${entries.length} dossier${entries.length === 1 ? "" : "s"}: ${count("fresh")} fresh, ${count("due-soon")} due soon, ${count("stale")} stale, ${count("superseded")} superseded, ${count("retracted")} retracted. [Stale list](stale.md) · [Superseded and retracted](changes.md) · [index.json](index.json)`,
    "",
    "**Freshness** comes from each dossier's re-check date, worked out on the day the index is built. **Checked by** says how far the fact-check went: *cross-checked* means a fresh session on a different model (or a person) checked it; *fact-checked* means a fresh session on the same model did.",
    "",
    ...FACETS.flatMap((facet) => [`## By ${facet}`, "", facetList(facet), ""]),
    "## Newest",
    "",
    table(entries.slice(0, RECENT), (e) => link(e, 0)),
  ].join("\n");
}

function writePage(out, file, text) {
  mkdirSync(dirname(join(out, file)), { recursive: true });
  writeFileSync(join(out, file), text.endsWith("\n") ? text : `${text}\n`);
}

/** Builds the index into `out`. Returns { entries, pages }. */
export function buildIndex({ root, out, repo, branch = "main", today = now() }) {
  const problems = collector();
  const lists = loadTags(root, problems);
  if (problems.errors.length) throw new Error(problems.errors.join("\n"));
  const entries = collect(root, today);
  const link = repo
    ? (e) => `https://github.com/${repo}/tree/${branch}/${e.path}`
    : (e, depth) => `${"../".repeat(depth + 1)}${e.path}`;
  for (const facet of FACETS) rmSync(join(out, facet), { recursive: true, force: true });
  const pages = tagPages(entries, lists, link, out);
  writePage(out, "README.md", front(entries, pages, link, today));
  const stale = entries.filter((e) => e.freshness === "stale" || e.freshness === "due-soon");
  writePage(out, "stale.md", `# Stale and due soon\n\nDossiers whose re-check date has passed, or comes within ${SOON_DAYS} days. A stale dossier may still be right: it just hasn't been checked lately. To re-check one, follow CONTRIBUTING.md. [Back](README.md)\n\n${table(stale, (e) => link(e, 0))}`);
  const changes = entries.filter((e) => e.status !== "current");
  writePage(out, "changes.md", `# Superseded and retracted\n\nThese stay in the commons so old links keep working. Read the newer dossier instead. [Back](README.md)\n\n${table(changes, (e) => link(e, 0))}`);
  writeFileSync(join(out, "index.json"), `${JSON.stringify({ schema: "research-index/1", built: today, repo: repo ?? null, branch, count: entries.length, dossiers: entries }, null, 1)}\n`);
  return { entries, pages };
}

function main(argv) {
  const args = argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = resolve(opt("--out", join(root, "index")));
  if (!existsSync(join(root, "tags"))) { console.error("No tags/ folder: run this from the commons."); return 2; }
  const { entries, pages } = buildIndex({ root, out, repo: opt("--repo"), branch: opt("--branch", "main"), today: opt("--today", now()) });
  console.log(`index: ${entries.length} dossiers, ${pages.length} tag pages, written to ${out}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
