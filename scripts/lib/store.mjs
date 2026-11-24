// Where things live in the commons, and how to read them.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const STORE = "dossiers";
export const ID = /^(\d{4})-(\d{2})-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;
export const FACETS = ["domain", "topic", "kind", "stack"];
export const CARD = "dossier.json";

/** The folder for a dossier id, relative to the repo root: dossiers/<year>/<month>/<id>. */
export function dossierPath(id) {
  const m = ID.exec(id);
  return m ? `${STORE}/${m[1]}/${m[2]}/${id}` : null;
}

/** The dossier id a repo path belongs to, or null. */
export function idOfPath(path) {
  const parts = path.split("/");
  return parts[0] === STORE && parts.length >= 5 && ID.test(parts[3]) ? parts[3] : null;
}

const folders = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory()).sort() : []);

/** Every dossier folder under the root, as [{ id, rel, dir }], oldest first. */
export function listDossiers(root) {
  const found = [];
  for (const year of folders(join(root, STORE)))
    for (const month of folders(join(root, STORE, year)))
      for (const id of folders(join(root, STORE, year, month)))
        found.push({ id, rel: `${STORE}/${year}/${month}/${id}`, dir: join(root, STORE, year, month, id) });
  return found;
}

/** Parses a JSON file. Reports and returns null when it can't. */
export function readJson(path, problems, label) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (err) { problems.error(label, `not valid JSON (${err.message})`); return null; }
}

/** A problem collector: { errors, warnings, error(where, msg), warn(where, msg) }. */
export function collector() {
  const errors = [], warnings = [];
  return {
    errors, warnings,
    error: (where, msg) => errors.push(`${where}: ${msg}`),
    warn: (where, msg) => warnings.push(`${where}: ${msg}`),
  };
}

/** Every file under a folder, as paths relative to it. */
export function walk(dir, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(join(dir, name)).isDirectory()) out.push(...walk(join(dir, name), rel));
    else out.push(rel);
  }
  return out;
}
