#!/usr/bin/env node
// Checks the commons. No dependencies; Node 22 or newer.
//
//   node scripts/check.mjs --all                 every dossier, the tag lists, and every tracked file for secrets
//   node scripts/check.mjs --base origin/main    a pull request: what it may change, and the dossier it touches
//   --maintainer        the pull request is the maintainer's: it may mix tooling, tag lists and one dossier
//   --today YYYY-MM-DD  sets the date (for tests)
//   --root <dir>        the repository root (default: the folder above scripts/)
//   --show-private      with --all, name the files that hold a private term (local runs only: CI logs are public)
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
import { changedFiles, LINK_MODE, listedFiles, mergeBase, trackedLinks } from "./lib/git.mjs";
import { HIDDEN, privateTerms, scanText } from "./lib/hygiene.mjs";
import { checkProvenance } from "./lib/provenance.mjs";
import { agentFileInDossier, badDossierName, checkFiles, checkScope, MAX_FILE } from "./lib/scope.mjs";
import { CARD, collector, isFile, listDossiers, NOT_REGULAR, readJson, readText, STORE, strayInStore } from "./lib/store.mjs";
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

// The full run on main has a public log, so it says only that a term was found, not where.
export const PRIVATE_FOUND = "a private term was found. Rerun locally with --all --show-private to see where";

function scanFiles(root, paths, { hideWhere, every }, problems) {
  const terms = privateTerms();
  let found = false;
  const onTerm = hideWhere ? () => { found = true; } : undefined;
  for (const path of paths) {
    const inStore = path.startsWith(`${STORE}/`);
    if (!(every || TEXT.test(path) || inStore) || !isFile(join(root, path)) || lstatSync(join(root, path)).size > MAX_FILE) continue;
    scanText(readText(join(root, path)), path, { terms, hiddenText: true, markdown: inStore && /\.md$/i.test(path), onTerm }, problems);
  }
  if (found) problems.errors.push(PRIVATE_FOUND);
  return terms.length;
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f\uFEFF]/;

/**
 * Every listed path must be a regular file on disk, with no control characters in its name: a link
 * (git mode 120000), a special file, or a name the checker can't map to a file would skip its rules.
 * Reports each; true if any.
 */
function refusePaths(root, paths, links, problems) {
  const bad = new Map(links.map((path) => [path, NOT_REGULAR]));
  for (const path of paths) {
    if (CONTROL.test(path) || HIDDEN.test(path)) bad.set(path, "has a control or invisible character in its name: rename it");
    else if (bad.has(path) || isFile(join(root, path))) continue;
    else bad.set(path, lstatSync(join(root, path), { throwIfNoEntry: false }) ? NOT_REGULAR : "is listed by git but is not a file on disk");
  }
  for (const [path, message] of bad) problems.error(CONTROL.test(path) || HIDDEN.test(path) ? JSON.stringify(path) : path, message);
  return bad.size > 0;
}

const AGENT_FILE = "is named like an agent instruction or configuration file (claude, agents, gemini, copilot, cursor, windsurf, .mcp.json and the like). None may sit inside a dossier";
const BAD_NAME = "has a name that isn't lower-case kebab-case: folders use a-z, 0-9 and -, files add one allowed extension. README.md is allowed only at the top of the dossier. Rename it";

/** Paths under dossiers/ outside a dossier folder, and agent files inside one. Reports each. */
function checkStorePaths(paths, problems) {
  for (const path of paths) {
    if (strayInStore(path)) problems.error(path, STRAY);
    else if (agentFileInDossier(path)) problems.error(path, AGENT_FILE);
    else if (badDossierName(path)) problems.error(path, BAD_NAME);
  }
}

const STRAY = "is under dossiers/ but not inside a dossier folder, dossiers/<yyyy>/<mm>/<yyyy-mm-dd-slug>/. Make the folder with scripts/new-dossier.mjs";

/** What to check: every file, or a pull request's changes against the merge base. Null when git can't tell. */
function listPaths(root, base, all, problems) {
  if (all || !base) {
    const paths = listedFiles(root);
    checkStorePaths(paths, problems);
    return { paths, links: trackedLinks(root) };
  }
  const from = mergeBase(root, base);
  if (!from) { problems.error("--base", `git could not find the merge base with ${base}`); return null; }
  const changes = changedFiles(root, from), kept = changes.filter((c) => c.status !== "D");
  checkStorePaths(changes.map((c) => c.path), problems);
  return { from, changes, paths: kept.map((c) => c.path), links: kept.filter((c) => c.mode === LINK_MODE).map((c) => c.path) };
}

/** Runs the checks. Returns { errors, warnings, checked, total, terms }. */
export function check({ root, base, all = false, maintainer = false, showPrivate = false, today = now() }) {
  const problems = collector();
  const stop = () => ({ errors: problems.errors, warnings: problems.warnings, checked: 0, total: 0, terms: 0 });
  const listed = listPaths(root, base, all, problems);
  if (!listed || refusePaths(root, listed.paths, listed.links, problems)) return stop();
  const lists = loadTags(root, problems);
  const { cards, where } = loadCards(root, problems);
  checkLinks(cards, problems);
  let ids = [...where.keys()];
  if (listed.changes) ids = checkScope(root, listed.from, listed.changes, { maintainer }, problems).filter((id) => where.has(id));
  for (const id of ids) checkDossier(where.get(id), cards.get(id), lists, today, problems);
  const terms = scanFiles(root, listed.paths, { hideWhere: !listed.changes && !showPrivate, every: Boolean(listed.changes) }, problems);
  return { errors: problems.errors, warnings: problems.warnings, checked: ids.length, total: where.size, terms };
}

function main(argv) {
  const args = argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const flag = (name) => { const i = args.indexOf(name); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const root = resolve(opt("--root") ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const result = check({ root, base: opt("--base"), today: opt("--today"), all: flag("--all"), maintainer: flag("--maintainer"), showPrivate: flag("--show-private") });
  for (const e of result.errors) console.error(`error: ${e}`);
  for (const w of result.warnings) console.log(`warn:  ${w}`);
  console.log(`check: ${result.checked} of ${result.total ?? 0} dossiers checked, ${result.errors.length} errors, ${result.warnings.length} warnings. Private-terms list: ${result.terms ? "set" : "not set, skipped"}.`);
  return result.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
