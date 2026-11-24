#!/usr/bin/env node
// Checks that the links in a dossier resolve. No dependencies; Node 22 or newer.
//
//   node scripts/check-links.mjs --base origin/main     the dossiers a pull request touches
//   node scripts/check-links.mjs --all                  every dossier (slow; for the weekly run)
//   node scripts/check-links.mjs <dossier folder>...    the folders named
//
// A missing page (404, 410) or a host that does not exist fails. Sites that refuse robots (401, 403,
// 429 and the like) and timeouts only warn: a person checks those by hand. Links inside the repo
// must point at a file that exists inside the repo; one that climbs out of it fails without being looked up.
//
// Only sources that a claim cites are checked: sources.csv also logs failed attempts on purpose.
// Skipped too: a source whose title marks a failed attempt (NOT FOUND:, BLOCKED:, HTTP 404), and a
// source named by a later row whose location is "gone: <id>".
import { existsSync, lstatSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readTable } from "./lib/csv.mjs";
import { changedFiles, mergeBase } from "./lib/git.mjs";
import { collector, idOfPath, listDossiers, readText, walk } from "./lib/store.mjs";

const TIMEOUT = 15000, WORKERS = 6;
const AGENT = "onrails-research-link-check/1 (+https://github.com/jsmigendevelopment/onRails-Research)";
const MD_LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const FAILED = /^(NOT FOUND|BLOCKED|NOT RETRIEVED|GONE)\b|HTTP 404/i;

/** The ids of sources that claims cite. */
function citedSources(dir, id, problems) {
  if (!existsSync(join(dir, "claims.csv"))) return new Set();
  const rows = readTable(join(dir, "claims.csv"), ["id", "claim", "label", "sources", "date"], problems, `${id}/claims.csv`) ?? [];
  return new Set(rows.flatMap((r) => r.sources.split(";").map((s) => s.trim())));
}

/** Every link in a dossier: { url, where } for the web, { path, where } for files in the repo. */
export function linksOf(dir, id, problems) {
  const links = [];
  if (existsSync(join(dir, "sources.csv"))) {
    const rows = readTable(join(dir, "sources.csv"), ["id", "title", "location", "accessed", "read"], problems, `${id}/sources.csv`) ?? [];
    const cited = citedSources(dir, id, problems);
    const gone = new Set(rows.map((r) => /^gone:\s*(\S+)/i.exec(r.location)?.[1]).filter(Boolean));
    for (const row of rows) {
      if (!/^https?:\/\//.test(row.location) || !cited.has(row.id) || gone.has(row.id) || FAILED.test(row.title)) continue;
      links.push({ url: row.location, where: `${id}/sources.csv:${row.line}` });
    }
  }
  for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
    readText(join(dir, file)).split(/\r?\n/).forEach((line, n) => {
      for (const [, target] of line.matchAll(MD_LINK)) {
        const where = `${id}/${file}:${n + 1}`;
        if (/^https?:\/\//.test(target)) links.push({ url: target, where });
        else if (!/^(#|mailto:)/.test(target)) links.push({ path: join(dir, dirname(file), decodeURI(target.split("#")[0])), where, target });
      }
    });
  }
  return links;
}

async function probe(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT), headers: { "user-agent": AGENT, accept: "*/*" } });
      res.body?.cancel();
      if (res.ok) return { ok: true };
      if (method === "HEAD" && res.status !== 404 && res.status !== 410) continue;
      return { status: res.status };
    } catch (err) {
      if (method === "GET") return { error: err.cause?.code ?? err.name ?? "error" };
    }
  }
  return { error: "no answer" };
}

/** True when a path, once `..` is resolved, is the repo root or inside it. */
export const insideRoot = (root, path) => { const at = resolve(path), top = resolve(root); return at === top || at.startsWith(top + sep); };

/** Checks every link. Repo links must stay under `root`; web links are de-duplicated and checked a few at a time. */
export async function checkLinks(links, problems, root) {
  for (const link of links.filter((l) => l.path)) {
    if (!insideRoot(root, link.path)) problems.error(link.where, `links ${link.target}, which is outside the repo`);
    else if (!lstatSync(link.path, { throwIfNoEntry: false })) problems.error(link.where, `links ${link.target}, which is not in the repo`);
  }
  const byUrl = new Map();
  for (const link of links.filter((l) => l.url)) byUrl.set(link.url, [...(byUrl.get(link.url) ?? []), link.where]);
  const queue = [...byUrl.keys()];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const result = await probe(url);
      if (result.ok) continue;
      const where = byUrl.get(url)[0];
      if (result.status === 404 || result.status === 410) problems.error(where, `${url} answers ${result.status}: the page is gone. Use an archived copy, or mark the source as gone in a new row`);
      else if (result.error === "ENOTFOUND") problems.error(where, `${url}: the host does not exist`);
      else problems.warn(where, `${url}: ${result.status ? `answered ${result.status}` : result.error}. Many sites refuse robots; check it by hand`);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  return byUrl.size;
}

async function main(argv) {
  const args = argv.slice(2);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const problems = collector();
  const all = listDossiers(root);
  let picked;
  if (args.includes("--all")) picked = all;
  else if (args.includes("--base")) {
    const from = mergeBase(root, args[args.indexOf("--base") + 1]);
    if (!from) { console.error("error: git could not find the merge base"); return 1; }
    const ids = new Set(changedFiles(root, from).filter((c) => c.status !== "D").map((c) => idOfPath(c.path)).filter(Boolean));
    picked = all.filter((d) => ids.has(d.id));
  } else picked = all.filter((d) => args.some((a) => resolve(a) === d.dir));
  const links = picked.flatMap((d) => linksOf(d.dir, d.id, problems));
  const urls = await checkLinks(links, problems, root);
  for (const e of problems.errors) console.error(`error: ${e}`);
  for (const w of problems.warnings) console.log(`warn:  ${w}`);
  console.log(`links: ${picked.length} dossiers, ${urls} web links, ${problems.errors.length} broken, ${problems.warnings.length} to check by hand`);
  return problems.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv);
