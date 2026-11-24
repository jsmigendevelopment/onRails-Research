// Where things live in the commons, and how to read them.
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readdirSync } from "node:fs";
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

// Pull request files are untrusted, so a symbolic link is never followed: lstat, and open with O_NOFOLLOW.
const entry = (path) => lstatSync(path, { throwIfNoEntry: false });
/** True for a regular file (not a link, a folder, a device or a pipe). */
export const isFile = (path) => entry(path)?.isFile() ?? false;
/** True for a real folder (not a link to one). */
export const isDir = (path) => entry(path)?.isDirectory() ?? false;
export const NOT_REGULAR = "is a symbolic link or a special file, not a regular file. Commit the file itself";

/** Reads a regular file as text. Throws, naming only the path, for a link or anything that isn't a regular file. */
export function readText(path) {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    if (!fstatSync(fd).isFile()) throw new Error(`${path} ${NOT_REGULAR}`);
    return readFileSync(fd, "utf8");
  } finally { closeSync(fd); }
}

const folders = (dir) => (isDir(dir) ? readdirSync(dir).filter((n) => isDir(join(dir, n))).sort() : []);

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
  if (!isFile(path)) { problems.error(label, NOT_REGULAR); return null; }
  // The parser's message quotes the file's text, so it is left out.
  try { return JSON.parse(readText(path)); }
  catch { problems.error(label, "not valid JSON: check it with a JSON validator"); return null; }
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

/** Every regular file under a folder, as paths relative to it. Links and special files go in `others`, never followed. */
export function walk(dir, others = [], prefix = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = lstatSync(join(dir, name));
    if (stat.isDirectory()) out.push(...walk(join(dir, name), others, rel));
    else if (stat.isFile()) out.push(rel);
    else others.push(rel);
  }
  return out;
}
