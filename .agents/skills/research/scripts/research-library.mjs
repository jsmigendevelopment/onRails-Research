#!/usr/bin/env node
// A research library is a private repo that every deep research is captured to, across projects.
// Its research-library.json says where each part of an entry goes (library.schema.json in the
// research skill). This file validates the manifest, resolves its {placeholders}, writes the index
// entries and checks that the repo is private. No dependencies.
// The master is scripts/research-library.mjs in the kit; sync-skills copies it.
// Usage:  node research-library.mjs check <library dir>        validate research-library.json
//         node research-library.mjs private <owner/repo>        exit 1 unless GitHub says it's private
//         node research-library.mjs paths <library dir> <vars.json>   print every resolved path as JSON
//         node research-library.mjs index <library dir> <vars.json>   add the entry to every index file
//         node research-library.mjs library [project dir]      print [research] library from the personal profile
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA = "research-library/1";
export const MANIFEST = "research-library.json";
export const REQUIRED = ["schema", "private", "layout", "index", "provenance", "checks"];
export const OPTIONAL = ["description", "frozen", "notes"];
export const LAYOUT_PATHS = ["report", "store", "provenance", "data"];
export const BRIEF_ROLES = ["author", "helper", "fact-check"];
export const INSERTS = ["after-anchor", "line-end", "table-end", "file-end"];
// Placeholders a layout path may use, and the extra ones an index entry may use.
export const PATH_VARS = ["slug", "name"];
export const ENTRY_VARS = ["slug", "date", "title", "summary", "question", "decision", "status", "recheck", "model", "effort", "project"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
const PLACEHOLDER = /\{([a-z-]+)\}/g;

const placeholders = (text) => [...text.matchAll(PLACEHOLDER)].map((m) => m[1]);

// A path in the manifest: relative, "/" separated, inside the library.
function pathProblem(path) {
  if (typeof path !== "string" || !path.trim()) return "must be a non-empty path";
  if (isAbsolute(path) || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return "must be relative to the library root";
  if (path.includes("\\")) return 'must use "/", not "\\"';
  if (path.split("/").includes("..")) return 'must stay inside the library (no "..")';
  return null;
}

function checkTemplatePath(path, where, allowed, errors, { needsSlug = true } = {}) {
  const problem = pathProblem(path);
  if (problem) return errors.push(`${where} ${problem}`);
  const used = placeholders(path);
  for (const name of used) if (!allowed.includes(name)) errors.push(`${where} uses {${name}}; a path may use ${allowed.map((v) => `{${v}}`).join(", ")}`);
  if (needsSlug && !used.includes("slug")) errors.push(`${where} needs {slug}, or every entry lands in one place`);
}

function checkIndex(index, dir, errors) {
  if (!Array.isArray(index) || !index.length) return errors.push("index must list at least one file to update");
  index.forEach((entry, n) => {
    const where = `index[${n}]`;
    if (!entry || typeof entry !== "object") return errors.push(`${where} must be an object`);
    const problem = pathProblem(entry.file);
    if (problem) errors.push(`${where}.file ${problem}`);
    else if (dir && !existsSync(join(dir, entry.file))) errors.push(`${where}.file ${entry.file} not found`);
    if (!INSERTS.includes(entry.insert)) errors.push(`${where}.insert must be one of ${INSERTS.join(", ")}`);
    if (entry.insert !== "file-end" && (typeof entry.anchor !== "string" || !entry.anchor)) errors.push(`${where}.anchor is needed for ${entry.insert}: the start of the line to find`);
    if (typeof entry.entry !== "string" || !entry.entry) return errors.push(`${where}.entry must be the text to add`);
    for (const name of placeholders(entry.entry)) if (!ENTRY_VARS.includes(name)) errors.push(`${where}.entry uses {${name}}; an entry may use ${ENTRY_VARS.map((v) => `{${v}}`).join(", ")}`);
  });
}

/** Validates a parsed manifest. With dir, also checks that the files it names exist. Returns error strings. */
export function validateManifest(manifest, dir) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["the manifest must be a JSON object"];
  for (const key of REQUIRED) if (!(key in manifest)) errors.push(`${key} is missing`);
  for (const key of Object.keys(manifest)) if (!REQUIRED.includes(key) && !OPTIONAL.includes(key)) errors.push(`${key} is not a manifest field`);
  if ("schema" in manifest && manifest.schema !== SCHEMA) errors.push(`schema must be "${SCHEMA}"`);
  if ("private" in manifest && manifest.private !== true) errors.push("private must be true: a research library is always a private repo");
  const layout = manifest.layout;
  if (layout && typeof layout === "object") {
    for (const key of LAYOUT_PATHS) checkTemplatePath(layout[key], `layout.${key}`, ["slug"], errors);
    const briefs = layout.briefs;
    if (!briefs || typeof briefs !== "object") errors.push(`layout.briefs must map ${BRIEF_ROLES.join(", ")} to paths`);
    else {
      for (const role of BRIEF_ROLES) checkTemplatePath(briefs[role], `layout.briefs.${role}`, role === "helper" ? PATH_VARS : ["slug"], errors);
      if (typeof briefs.helper === "string" && !placeholders(briefs.helper).includes("name")) errors.push("layout.briefs.helper needs {name}, or two helpers share one brief");
    }
  } else if ("layout" in manifest) errors.push("layout must be an object");
  if ("index" in manifest) checkIndex(manifest.index, dir, errors);
  const prov = manifest.provenance;
  if (prov && typeof prov === "object") {
    if (typeof prov.id !== "string" || !prov.id) errors.push('provenance.id must name the record format, e.g. "research-provenance/1"');
    const problem = pathProblem(prov.schema);
    if (problem) errors.push(`provenance.schema ${problem}`);
    else if (dir && !existsSync(join(dir, prov.schema))) errors.push(`provenance.schema ${prov.schema} not found`);
    if (!["store", "root"].includes(prov.paths)) errors.push('provenance.paths must be "store" or "root": what a brief path in the record is relative to');
  } else if ("provenance" in manifest) errors.push("provenance must be an object");
  if ("checks" in manifest && (!Array.isArray(manifest.checks) || !manifest.checks.length || manifest.checks.some((c) => typeof c !== "string" || !c.trim()))) {
    errors.push("checks must list at least one command, run from the library root");
  }
  if ("frozen" in manifest && (!Array.isArray(manifest.frozen) || manifest.frozen.some((p) => pathProblem(p)))) errors.push("frozen must list relative paths");
  return errors;
}

/** Reads and validates <dir>/research-library.json. Returns { manifest, errors }. */
export function readManifest(dir) {
  const path = join(dir, MANIFEST);
  if (!existsSync(path)) return { manifest: null, errors: [`${MANIFEST} not found in ${dir}`] };
  let manifest;
  try { manifest = JSON.parse(readFileSync(path, "utf8")); }
  catch (err) { return { manifest: null, errors: [`${MANIFEST} is not valid JSON (${err.message})`] }; }
  return { manifest, errors: validateManifest(manifest, dir) };
}

/** Fills {slug}, {name} and the like. Throws on a missing value, or a slug or name that isn't kebab-case. */
export function resolvePath(template, vars) {
  const out = template.replace(PLACEHOLDER, (_, name) => {
    const value = vars[name];
    if (typeof value !== "string" || !value) throw new Error(`no value for {${name}} in ${template}`);
    if (PATH_VARS.includes(name) && !SLUG.test(value)) throw new Error(`{${name}} must be lowercase words joined by "-", got "${value}"`);
    return value;
  });
  const problem = pathProblem(out);
  if (problem) throw new Error(`${out} ${problem}`);
  return out;
}

/** Every path one entry writes: report, store, provenance, data, and a brief per role (helpers by name). */
export function entryPaths(manifest, { slug, helpers = [] }) {
  const { layout } = manifest;
  const paths = Object.fromEntries(LAYOUT_PATHS.map((key) => [key, resolvePath(layout[key], { slug })]));
  paths.briefs = { author: resolvePath(layout.briefs.author, { slug }), "fact-check": resolvePath(layout.briefs["fact-check"], { slug }) };
  paths.briefs.helpers = Object.fromEntries(helpers.map((name) => [name, resolvePath(layout.briefs.helper, { slug, name })]));
  paths.index = manifest.index.map((i) => i.file);
  return paths;
}

const fill = (text, vars) => text.replace(PLACEHOLDER, (_, name) => {
  if (typeof vars[name] !== "string") throw new Error(`no value for {${name}} in an index entry`);
  return vars[name].replace(/\r?\n/g, " ");
});

/** Adds one index entry to a file's text, where the manifest says. Throws when the anchor isn't there. */
export function insertEntry(text, index, vars) {
  const entry = fill(index.entry, vars);
  if (index.insert === "file-end") return `${text.replace(/\n*$/, "")}\n${entry}\n`;
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.startsWith(index.anchor));
  if (at < 0) throw new Error(`${index.file}: no line starts with ${JSON.stringify(index.anchor)}`);
  if (index.insert === "line-end") lines[at] += entry;
  else if (index.insert === "after-anchor") lines.splice(at + 1, 0, "", ...entry.replace(/\n+$/, "").split("\n"));
  else {
    let end = at;
    while (end + 1 < lines.length && lines[end + 1].trim().startsWith("|")) end++;
    lines.splice(end + 1, 0, entry);
  }
  return lines.join("\n");
}

/** Asks GitHub whether repo is private. run(cmd, args) returns stdout; the default runs gh. */
export function checkPrivate(repo, { run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) } = {}) {
  if (typeof repo !== "string" || !REPO.test(repo)) return { ok: false, reason: `"${repo}" is not owner/repo` };
  let answer;
  try { answer = run("gh", ["api", `repos/${repo}`, "--jq", ".private"]).trim(); }
  catch (err) { return { ok: false, reason: `couldn't confirm ${repo} is private (${String(err.message).split("\n")[0]}). Nothing was captured.` }; }
  if (answer === "true") return { ok: true, reason: `${repo} is private` };
  if (answer === "false") return { ok: false, reason: `${repo} is public. A research library must be private: research can name private projects. Nothing was captured.` };
  return { ok: false, reason: `GitHub gave "${answer}" for ${repo}.private, not true. Nothing was captured.` };
}

// The library's name and path are personal: they live in ~/.onrails/profile.toml only, never in a
// project's docs/profile.toml, because a project can be public and the library names a private repo.
export const PERSONAL_KEYS = ["library", "library_path"];
export const PERSONAL_NOTE = "set in your personal profile only";

// Each line of a TOML file with the [section] it sits in. Enough for flat key = "value" lines.
function tomlLines(toml) {
  let section = "";
  return toml.split("\n").map((line) => {
    const header = /^\s*\[([^\]]+)\]\s*(#.*)?$/.exec(line);
    if (header) section = header[1].trim();
    const kv = /^\s*([A-Za-z0-9_-]+)\s*=\s*("((?:[^"\\]|\\.)*)"|'([^']*)'|[^#\s]*)/.exec(line);
    return { line, section, key: kv?.[1], value: kv ? (kv[3] ?? kv[4] ?? kv[2]) : undefined };
  });
}

/** The [research] library or library_path values set in a TOML text, as { key: value }; empty ones left out. */
export function personalValues(toml) {
  const found = {};
  for (const l of tomlLines(toml)) if (l.section === "research" && PERSONAL_KEYS.includes(l.key) && l.value) found[l.key] = l.value;
  return found;
}

/** A profile fit for a project: [research] library and library_path replaced by a comment. */
export function stripPersonal(toml) {
  return tomlLines(toml)
    .map((l) => (l.section === "research" && PERSONAL_KEYS.includes(l.key) ? `# ${l.key}: ${PERSONAL_NOTE}` : l.line))
    .join("\n");
}

/** The personal profile's path: ~/.onrails/profile.toml, or ~/.ai-dev-workflow/ while only that exists. */
export function personalProfilePath(home = homedir()) {
  const now = join(home, ".onrails"), old = join(home, ".ai-dev-workflow");
  return join(!existsSync(now) && existsSync(old) ? old : now, "profile.toml");
}

/** [research] library and library_path from the personal profile. A project's own value is ignored, with a warning. */
export function readLibrarySetting({ home, projectDir } = {}) {
  const path = personalProfilePath(home);
  const values = existsSync(path) ? personalValues(readFileSync(path, "utf8")) : {};
  const warnings = [];
  const project = projectDir && join(projectDir, "docs", "profile.toml");
  if (project && existsSync(project) && Object.keys(personalValues(readFileSync(project, "utf8"))).length) {
    warnings.push(`${project} sets [research] library or library_path. Ignored: they belong in ${path} only. Delete them from the project.`);
  }
  return { library: values.library ?? "", library_path: values.library_path ?? "", warnings };
}

function main(argv) {
  const [command, target, varsFile] = argv.slice(2);
  const usage = "Usage: node research-library.mjs check <dir> | private <owner/repo> | paths <dir> <vars.json> | index <dir> <vars.json> | library [project dir]";
  if (command === "library") {
    const r = readLibrarySetting({ projectDir: resolve(target ?? ".") });
    for (const w of r.warnings) console.error(`warn: ${w}`);
    console.log(JSON.stringify({ library: r.library, library_path: r.library_path }));
    return 0;
  }
  if (command === "private") {
    const r = checkPrivate(target);
    (r.ok ? console.log : console.error)(r.ok ? `ok: ${r.reason}` : `refused: ${r.reason}`);
    return r.ok ? 0 : 1;
  }
  if (!["check", "paths", "index"].includes(command) || !target) { console.error(usage); return 2; }
  const dir = resolve(target);
  const { manifest, errors } = readManifest(dir);
  for (const e of errors) console.error(`error: ${MANIFEST}: ${e}`);
  if (errors.length) return 1;
  if (command === "check") { console.log(`${MANIFEST}: ok (${manifest.checks.length} check command(s))`); return 0; }
  if (!varsFile) { console.error(usage); return 2; }
  const vars = JSON.parse(readFileSync(varsFile, "utf8"));
  if (command === "paths") { console.log(JSON.stringify(entryPaths(manifest, vars), null, 2)); return 0; }
  for (const index of manifest.index) {
    const file = join(dir, index.file);
    writeFileSync(file, insertEntry(readFileSync(file, "utf8"), index, vars));
    console.log(`added the entry to ${index.file}`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
