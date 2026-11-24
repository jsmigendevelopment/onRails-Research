// What one pull request may change, and what may never change once it is on main.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileAt } from "./git.mjs";
import { CARD, idOfPath, walk } from "./store.mjs";

export const MAX_FILE = 400 * 1024;
export const MAX_DOSSIER = 1024 * 1024;
export const ALLOWED = [".md", ".json", ".csv", ".tsv", ".txt", ".svg", ".mjs", ".js", ".py", ".sh"];
const GROWS = /(^|\/)(sources|claims|fact-check)\.csv$/;
const FROZEN = /(^|\/)(runs|briefs)\//;
const CORE = ["README.md", CARD, "provenance.json", "sources.csv", "claims.csv"];
const LIFECYCLE = ["status", "superseded_by", "recheck", "history"];
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

/** True when a dossier's only change is its card being marked as superseded by `byId`. */
function onlySuperseded(root, base, id, changes, byId) {
  if (changes.length !== 1 || changes[0].status !== "M" || !changes[0].path.endsWith(`/${CARD}`)) return false;
  const before = parse(fileAt(root, base, changes[0].path) ?? ""), after = parse(readFileSync(join(root, changes[0].path), "utf8"));
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

function checkFrozen(root, base, change, problems) {
  const existed = fileAt(root, base, change.path);
  if (existed === null) return;
  if (FROZEN.test(change.path)) return problems.error(change.path, "changed or deleted, but run folders and briefs never change once merged. Add a new run folder or a new brief file");
  if (!GROWS.test(change.path)) return;
  if (change.status === "D") return problems.error(change.path, "deleted, but it is append-only");
  const before = existed.replace(/\r\n/g, "\n"), after = readFileSync(join(root, change.path), "utf8").replace(/\r\n/g, "\n");
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
  const after = existsSync(join(root, cardPath)) ? parse(readFileSync(join(root, cardPath), "utf8")) : null;
  if (after && (after.history?.length ?? 0) <= (before.history?.length ?? 0)) problems.error(`${id}/${CARD}`, "this pull request changes a merged dossier, so add a history entry that says what changed and why");
}

/** Size and file-type limits for one dossier folder. */
export function checkFiles(dir, id, problems) {
  let total = 0;
  for (const rel of walk(dir)) {
    const size = statSync(join(dir, rel)).size;
    total += size;
    if (!ALLOWED.some((ext) => rel.toLowerCase().endsWith(ext))) problems.error(`${id}/${rel}`, `this file type is not allowed in a dossier (allowed: ${ALLOWED.join(" ")}). Big or binary data goes in data.json as a link`);
    if (size > MAX_FILE) problems.error(`${id}/${rel}`, `is ${kb(size)}. One file may be ${kb(MAX_FILE)} at most. Move big data out and link it in data.json`);
  }
  if (total > MAX_DOSSIER) problems.error(id, `is ${kb(total)} in all. A dossier may be ${kb(MAX_DOSSIER)} at most. Move data out and link it in data.json`);
}

/** Checks a pull request's changes against the merge base. Returns the ids of the dossiers it touches. */
export function checkScope(root, base, changes, { maintainer = false } = {}, problems) {
  const sorted = classify(changes);
  checkOneDossier(root, base, sorted.dossiers, problems);
  checkMix(sorted, maintainer, problems);
  for (const [id, list] of sorted.dossiers) checkExisting(root, base, id, list, problems);
  return [...sorted.dossiers.keys()];
}
