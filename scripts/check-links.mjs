#!/usr/bin/env node
// Checks that the links in a dossier resolve. No dependencies; Node 22 or newer.
//
//   node scripts/check-links.mjs --base origin/main     the dossiers a pull request touches
//   node scripts/check-links.mjs --all                  every dossier (slow; for the weekly run)
//   node scripts/check-links.mjs <dossier folder>...    the folders named
//
// A missing page (404, 410) or a host that does not exist fails. Sites that refuse robots (401, 403,
// 429 and the like) and timeouts only warn: a person checks those by hand. Links inside the repo
// must point at a file that exists.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readTable } from "./lib/csv.mjs";
import { changedFiles, mergeBase } from "./lib/git.mjs";
import { collector, idOfPath, listDossiers, walk } from "./lib/store.mjs";

const TIMEOUT = 15000, WORKERS = 6;
const AGENT = "onrails-research-link-check/1 (+https://github.com/jsmigendevelopment/onRails-Research)";
const MD_LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** Every link in a dossier: { url, where } for the web, { path, where } for files in the repo. */
export function linksOf(dir, id, problems) {
  const links = [];
  if (existsSync(join(dir, "sources.csv"))) {
    for (const row of readTable(join(dir, "sources.csv"), ["id", "title", "location", "accessed", "read"], problems, `${id}/sources.csv`) ?? [])
      if (/^https?:\/\//.test(row.location)) links.push({ url: row.location, where: `${id}/sources.csv:${row.line}` });
  }
  for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
    readFileSync(join(dir, file), "utf8").split(/\r?\n/).forEach((line, n) => {
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

/** Checks every link. Web links are de-duplicated and checked a few at a time. */
export async function checkLinks(links, problems) {
  for (const link of links.filter((l) => l.path)) if (!existsSync(link.path)) problems.error(link.where, `links ${link.target}, which is not in the repo`);
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
  const urls = await checkLinks(links, problems);
  for (const e of problems.errors) console.error(`error: ${e}`);
  for (const w of problems.warnings) console.log(`warn:  ${w}`);
  console.log(`links: ${picked.length} dossiers, ${urls} web links, ${problems.errors.length} broken, ${problems.warnings.length} to check by hand`);
  return problems.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv);
