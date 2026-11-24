#!/usr/bin/env node
// Checks the commons. No dependencies; Node 22 or newer.
//
//   node scripts/check.mjs --all                 every dossier, the tag lists, and every tracked file for secrets
//   node scripts/check.mjs --base origin/main    a pull request: what it may change, and the dossier it touches
//   --maintainer        the pull request is the maintainer's: it may mix tooling, tag lists and one dossier
//   --today YYYY-MM-DD  sets the date (for tests)
//   --root <dir>        the repository root (default: the folder above scripts/)
//
// Errors fail the run. Each line says where the problem is and what to do about it.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkCard, checkLinks } from "./lib/card.mjs";
import { today as now } from "./lib/dates.mjs";
import { checkStores } from "./lib/desk.mjs";
import { changedFiles, git, mergeBase } from "./lib/git.mjs";
import { privateTerms, scanText } from "./lib/hygiene.mjs";
import { checkProvenance } from "./lib/provenance.mjs";
import { checkFiles, checkScope, MAX_FILE } from "./lib/scope.mjs";
import { CARD, collector, idOfPath, listDossiers, readJson } from "./lib/store.mjs";
import { loadTags } from "./lib/tags.mjs";

const TEXT = /\.(md|json|csv|tsv|txt|svg|mjs|js|py|sh|yml|yaml|toml)$|(^|\/)(CODEOWNERS|LICENSE[^/]*|\.gitattributes|\.gitignore)$/i;

/** Reads every card. Cheap: one small JSON file per dossier. */
function loadCards(root, problems) {
  const cards = new Map(), where = new Map();
  for (const entry of listDossiers(root)) {
    where.set(entry.id, entry);
    if (!existsSync(join(entry.dir, CARD))) { problems.error(`${entry.id}/${CARD}`, "missing: every dossier folder has a card"); continue; }
    const card = readJson(join(entry.dir, CARD), problems, `${entry.id}/${CARD}`);
    if (card) cards.set(entry.id, card);
  }
  return { cards, where };
}

function checkDossier(root, entry, card, lists, today, problems) {
  if (card) checkCard(card, { root, folder: entry.id, where: `${entry.id}/${CARD}`, lists, today }, problems);
  const record = checkProvenance(root, entry.dir, entry.id, problems);
  checkStores(root, entry.dir, entry.id, card, record, problems);
  checkFiles(entry.dir, entry.id, problems);
}

function scanFiles(root, paths, problems) {
  const terms = privateTerms();
  for (const path of paths) {
    if (!TEXT.test(path) || !existsSync(join(root, path)) || statSync(join(root, path)).size > MAX_FILE) continue;
    scanText(readFileSync(join(root, path), "utf8"), path, { terms, hiddenText: Boolean(idOfPath(path)) }, problems);
  }
  return terms.length;
}

/** Runs the checks. Returns { errors, warnings, checked, terms }. */
export function check({ root, base, all = false, maintainer = false, today = now() }) {
  const problems = collector();
  const lists = loadTags(root, problems);
  const { cards, where } = loadCards(root, problems);
  checkLinks(cards, problems);
  let ids = [...where.keys()], paths;
  if (all || !base) paths = git(["ls-files", "--cached", "--others", "--exclude-standard"], root).split("\n").filter(Boolean);
  else {
    const from = mergeBase(root, base);
    if (!from) { problems.error("--base", `git could not find the merge base with ${base}`); return { ...problems, checked: 0, terms: 0 }; }
    const changes = changedFiles(root, from);
    ids = checkScope(root, from, changes, { maintainer }, problems).filter((id) => where.has(id));
    paths = changes.filter((c) => c.status !== "D").map((c) => c.path);
  }
  for (const id of ids) checkDossier(root, where.get(id), cards.get(id), lists, today, problems);
  const terms = scanFiles(root, paths, problems);
  return { errors: problems.errors, warnings: problems.warnings, checked: ids.length, total: where.size, terms };
}

function main(argv) {
  const args = argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const flag = (name) => { const i = args.indexOf(name); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const root = resolve(opt("--root") ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const result = check({ root, base: opt("--base"), today: opt("--today"), all: flag("--all"), maintainer: flag("--maintainer") });
  for (const e of result.errors) console.error(`error: ${e}`);
  for (const w of result.warnings) console.log(`warn:  ${w}`);
  console.log(`check: ${result.checked} of ${result.total ?? 0} dossiers checked, ${result.errors.length} errors, ${result.warnings.length} warnings. Private-terms list: ${result.terms ? `${result.terms} terms` : "not set, skipped"}.`);
  return result.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
