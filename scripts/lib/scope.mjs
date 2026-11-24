// What one pull request may change, and what may never change once it is on main.
import { lstatSync } from "node:fs";
import { join } from "node:path";
import { fileAt } from "./git.mjs";
import { CARD, idOfPath, isFile, NOT_REGULAR, readText, walk } from "./store.mjs";

export const MAX_FILE = 400 * 1024;
export const MAX_DOSSIER = 1024 * 1024;
export const WARN_DOSSIER = 250 * 1024;
export const ALLOWED = [".md", ".json", ".csv", ".tsv", ".txt", ".svg", ".mjs", ".js", ".py", ".sh"];
const GROWS = /(^|\/)(sources|claims|fact-check)\.csv$/;
const FROZEN = /(^|\/)(runs|briefs)\//;
const CORE = ["README.md", CARD, "provenance.json", "sources.csv", "claims.csv"];
const LIFECYCLE = ["status", "superseded_by", "recheck", "history"];
// Names inside a dossier: an allow list, because a block list of what is dangerous always has gaps.
// Every folder and file below the dossier id is lower-case kebab-case; folders have no extension. The
// one exception is README.md at the top of the dossier, which GitHub shows with the folder.
const FOLDER = /^[a-z0-9][a-z0-9-]*$/;
const FILE = /^[a-z0-9][a-z0-9-]*\.(md|json|csv|tsv|txt|svg|mjs|js|py|sh)$/;
const CONTRIBUTOR_FILE = /^[a-z0-9][a-z0-9-]*\.(md|json|csv)$/;
// Names that instruct or configure agents, refused inside a dossier for everyone, maintainer included.
const AGENT_NAME = /^(claude|agents?|gemini|copilot|cursor|windsurf|crush|qwen|warp)([.-].*)?$|^\.(claude|agents|mcp\.json|cursorrules|windsurfrules)$/i;

const below = (path) => path.split("/").slice(4);

/** True when every name below the dossier id fits the allow list (`file` is the pattern for the file name). */
function namesFit(path, file) {
  const names = below(path), last = names.length - 1;
  return names.every((name, n) => (n < last ? FOLDER.test(name) : file.test(name) || (n === 0 && name === "README.md")));
}

/** True for a path inside a dossier with an agent-instruction name at any depth. */
export const agentFileInDossier = (path) => idOfPath(path) !== null && below(path).some((name) => AGENT_NAME.test(name));

/** True for a path inside a dossier whose names don't fit the allow list, for anyone. */
export const badDossierName = (path) => idOfPath(path) !== null && !namesFit(path, FILE);

/** True for a path a contributor may change: an .md, .json or .csv file inside a dossier, with allowed names. */
export const contributorMay = (path) => idOfPath(path) !== null && namesFit(path, CONTRIBUTOR_FILE) && !agentFileInDossier(path);
const kb = (n) => `${Math.ceil(n / 1024)} KB`;

/** Sorts changed paths into dossiers (by id), tag lists and everything else. */
export function classify(changes) {
  const sorted = { dossiers: new Map(), tags: [], other: [] };
  for (const change of changes) {
    const id = idOfPath(change.path);
    if (id) sorted.dossiers.set(id, [...(sorted.dossiers.get(id) ?? []), change]);
    else if (change.path.startsWith("tags/")) sorted.tags.push(change);
    else sorted.other.push(change);
  }
  return sorted;
}

const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };

/** True when every line of `before` is still in `after`, in order: text was only added. */
function onlyAdded(before, after) {
  const want = before.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  for (const line of after.replace(/\r\n/g, "\n").split("\n")) if (i < want.length && line === want[i]) i++;
  return i === want.length;
}

/** True when a dossier's only changes mark it as superseded by `byId`: lifecycle fields in its card, and a notice added to its README. */
function onlySuperseded(root, base, id, changes, byId) {
  const card = changes.find((c) => c.path.endsWith(`/${id}/${CARD}`));
  const readme = changes.find((c) => c.path.endsWith(`/${id}/README.md`));
  if (!card || card.status !== "M" || changes.some((c) => c !== card && c !== readme)) return false;
  if (readme && (readme.status !== "M" || !onlyAdded(fileAt(root, base, readme.path) ?? "", readText(join(root, readme.path))))) return false;
  const before = parse(fileAt(root, base, card.path) ?? ""), after = parse(readText(join(root, card.path)));
  if (!before || !after || after.superseded_by !== byId) return false;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].every((key) => LIFECYCLE.includes(key) || JSON.stringify(before[key]) === JSON.stringify(after[key]));
}

function checkOneDossier(root, base, dossiers, problems) {
  const ids = [...dossiers.keys()];
  if (ids.length < 2) return ids[0] ?? null;
  const mains = ids.filter((id) => !ids.some((other) => other !== id && onlySuperseded(root, base, id, dossiers.get(id), other)));
  if (mains.length === 1) return mains[0];
  problems.error("pull request", `touches ${ids.length} dossiers (${ids.join(", ")}). One dossier per pull request: split it. The one exception is marking an old dossier as superseded by the new one`);
  return null;
}

function checkMix(sorted, maintainer, problems) {
  if (maintainer) return;
  if (sorted.tags.length && sorted.dossiers.size) problems.error("pull request", "changes a tag list and a dossier. A new tag value needs its own small pull request, merged first");
  if (sorted.other.length && (sorted.tags.length || sorted.dossiers.size))
    problems.error("pull request", `changes ${sorted.other[0].path}${sorted.other.length > 1 ? ` and ${sorted.other.length - 1} more` : ""} next to a dossier or a tag list. Changes to scripts, workflows and docs go in their own pull request`);
}

function checkContributorPaths(changes, maintainer, problems) {
  if (maintainer) return;
  for (const change of changes)
    if (!contributorMay(change.path))
      problems.error(change.path, "only a maintainer may change this. A contributor's pull request changes only .md, .json and .csv files inside its dossier folder, dossiers/<yyyy>/<mm>/<yyyy-mm-dd-slug>/. Open an issue for anything else");
}

function checkFrozen(root, base, change, problems) {
  const existed = fileAt(root, base, change.path);
  if (existed === null) return;
  if (FROZEN.test(change.path)) return problems.error(change.path, "changed or deleted, but run folders and briefs never change once merged. Add a new run folder or a new brief file");
  if (!GROWS.test(change.path)) return;
  if (change.status === "D") return problems.error(change.path, "deleted, but it is append-only");
  const before = existed.replace(/\r\n/g, "\n"), after = readText(join(root, change.path)).replace(/\r\n/g, "\n");
  if (!after.startsWith(before)) problems.error(change.path, "changed, but it is append-only: add rows at the end. A wrong row gets a new row that corrects it");
}

function checkExisting(root, base, id, changes, problems) {
  const cardPath = changes[0].path.split("/").slice(0, 4).join("/") + `/${CARD}`;
  const before = parse(fileAt(root, base, cardPath) ?? "");
  if (!before) return;
  for (const change of changes) {
    if (change.status === "D" && CORE.some((f) => change.path.endsWith(`/${id}/${f}`))) problems.error(change.path, "deleted, but a dossier is never removed. Retract it instead: status \"retracted\" with a reason");
    checkFrozen(root, base, change, problems);
  }
  const after = isFile(join(root, cardPath)) ? parse(readText(join(root, cardPath))) : null;
  if (after && (after.history?.length ?? 0) <= (before.history?.length ?? 0)) problems.error(`${id}/${CARD}`, "this pull request changes a merged dossier, so add a history entry that says what changed and why");
}

/** Size and file-type limits for one dossier folder. */
export function checkFiles(dir, id, problems) {
  let total = 0;
  const others = [];
  const files = walk(dir, others);
  for (const rel of others) problems.error(`${id}/${rel}`, NOT_REGULAR);
  for (const rel of files) {
    const size = lstatSync(join(dir, rel)).size;
    total += size;
    if (!ALLOWED.some((ext) => rel.toLowerCase().endsWith(ext))) problems.error(`${id}/${rel}`, `this file type is not allowed in a dossier (allowed: ${ALLOWED.join(" ")}). Big or binary data goes in data.json as a link`);
    if (size > MAX_FILE) problems.error(`${id}/${rel}`, `is ${kb(size)}. One file may be ${kb(MAX_FILE)} at most. Move big data out and link it in data.json`);
  }
  if (total > MAX_DOSSIER) problems.error(id, `is ${kb(total)} in all. A dossier may be ${kb(MAX_DOSSIER)} at most. Move data out and link it in data.json`);
  else if (total > WARN_DOSSIER) problems.warn(id, `is ${kb(total)} in all. Above ${kb(WARN_DOSSIER)}, consider moving big tables or run data out to data.json: 10,000 dossiers this size would pass GitHub's size guidance`);
}

/** Checks a pull request's changes against the merge base. Returns the ids of the dossiers it touches. */
export function checkScope(root, base, changes, { maintainer = false } = {}, problems) {
  const sorted = classify(changes);
  checkOneDossier(root, base, sorted.dossiers, problems);
  checkMix(sorted, maintainer, problems);
  checkContributorPaths(changes, maintainer, problems);
  for (const [id, list] of sorted.dossiers) checkExisting(root, base, id, list, problems);
  return [...sorted.dossiers.keys()];
}
