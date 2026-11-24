#!/usr/bin/env node
// Checks the commons. No dependencies; Node 22 or newer.
//
//   node scripts/check.mjs --all                 every dossier, the tag lists, and every tracked file for secrets
//   node scripts/check.mjs --base origin/main    a pull request: what it may change, and the dossier it touches
//   --maintainer        the pull request is the maintainer's: it may mix tooling, tag lists and one dossier
//   --today YYYY-MM-DD  sets the date (for tests)
//   --root <dir>        the repository root (default: the folder above scripts/)
//
// The schemas always come from this checker's own checkout, not from --root. A symbolic link or a
// special file anywhere in what is checked stops the run before any file is read.
//
// Errors fail the run. Each line says where the problem is and what to do about it.
import { existsSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkCard, checkLinks } from "./lib/card.mjs";
import { today as now } from "./lib/dates.mjs";
import { checkStores } from "./lib/desk.mjs";
import { changedFiles, git, LINK_MODE, mergeBase, trackedLinks } from "./lib/git.mjs";
import { privateTerms, scanText } from "./lib/hygiene.mjs";
import { checkProvenance } from "./lib/provenance.mjs";
import { checkFiles, checkScope, MAX_FILE } from "./lib/scope.mjs";
import { CARD, collector, idOfPath, isFile, listDossiers, NOT_REGULAR, readJson, readText } from "./lib/store.mjs";
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

function checkDossier(entry, card, lists, today, problems) {
  if (card) checkCard(card, { folder: entry.id, where: `${entry.id}/${CARD}`, lists, today }, problems);
  const record = checkProvenance(entry.dir, entry.id, problems);
  checkStores(entry.dir, entry.id, card, record, problems);
  checkFiles(entry.dir, entry.id, problems);
}

function scanFiles(root, paths, problems) {
  const terms = privateTerms();
  for (const path of paths) {
    if (!TEXT.test(path) || !isFile(join(root, path)) || lstatSync(join(root, path)).size > MAX_FILE) continue;
    scanText(readText(join(root, path)), path, { terms, hiddenText: Boolean(idOfPath(path)) }, problems);
  }
  return terms.length;
}

/** Symbolic links (git mode 120000) and anything on disk that isn't a regular file. Reports each; true if any. */
function refuseLinks(root, paths, links, problems) {
  const bad = new Set(links);
  for (const path of paths) if (lstatSync(join(root, path), { throwIfNoEntry: false }) && !isFile(join(root, path))) bad.add(path);
  for (const path of bad) problems.error(path, NOT_REGULAR);
  return bad.size > 0;
}

/** What to check: every file, or a pull request's changes against the merge base. Null when git can't tell. */
function listPaths(root, base, all, problems) {
  if (all || !base) return { paths: git(["ls-files", "--cached", "--others", "--exclude-standard"], root).split("\n").filter(Boolean), links: trackedLinks(root) };
  const from = mergeBase(root, base);
  if (!from) { problems.error("--base", `git could not find the merge base with ${base}`); return null; }
  const changes = changedFiles(root, from), kept = changes.filter((c) => c.status !== "D");
  return { from, changes, paths: kept.map((c) => c.path), links: kept.filter((c) => c.mode === LINK_MODE).map((c) => c.path) };
}

/** Runs the checks. Returns { errors, warnings, checked, total, terms }. */
export function check({ root, base, all = false, maintainer = false, today = now() }) {
  const problems = collector();
  const stop = () => ({ errors: problems.errors, warnings: problems.warnings, checked: 0, total: 0, terms: 0 });
  const listed = listPaths(root, base, all, problems);
  if (!listed || refuseLinks(root, listed.paths, listed.links, problems)) return stop();
  const lists = loadTags(root, problems);
  const { cards, where } = loadCards(root, problems);
  checkLinks(cards, problems);
  let ids = [...where.keys()];
  if (listed.changes) ids = checkScope(root, listed.from, listed.changes, { maintainer }, problems).filter((id) => where.has(id));
  for (const id of ids) checkDossier(where.get(id), cards.get(id), lists, today, problems);
  const terms = scanFiles(root, listed.paths, problems);
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
  console.log(`check: ${result.checked} of ${result.total ?? 0} dossiers checked, ${result.errors.length} errors, ${result.warnings.length} warnings. Private-terms list: ${result.terms ? "set" : "not set, skipped"}.`);
  return result.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
