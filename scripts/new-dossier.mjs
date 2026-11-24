#!/usr/bin/env node
// Writes a new dossier folder from templates/dossier/, with a stable ID and tags from the fixed lists.
//
//   node scripts/new-dossier.mjs --title "How big can a Git LFS repo get for free?" --kind comparison \
//     --domain research --topic storage --stack github [--question "..."] [--slug lfs-free-limits] \
//     [--supersedes <old id>] [--measurements] [--date YYYY-MM-DD] [--dry]
//
// Repeat --domain, --topic and --stack for more than one value (the first --domain is the main one).
// Prints the folder it wrote. It never overwrites a folder.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addMonths, today as now, validDate } from "./lib/dates.mjs";
import { collector, dossierPath, FACETS, ID, listDossiers, walk } from "./lib/store.mjs";
import { loadTags } from "./lib/tags.mjs";

const RECHECK_MONTHS = 6;
const SKIP = new Set(["sections.json"]);

/** A short, lower-case slug from a title: at most six words and 40 characters. */
export function slugify(title) {
  const words = title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/);
  const small = new Set(["a", "an", "the", "of", "for", "to", "and", "or", "in", "on", "with", "how", "what", "which", "is", "are", "can", "do", "does", "we", "i", "it"]);
  const kept = words.filter((w) => !small.has(w));
  let slug = "";
  for (const word of (kept.length ? kept : words).slice(0, 6)) {
    if ((slug ? slug.length + 1 : 0) + word.length > 40) break;
    slug = slug ? `${slug}-${word}` : word;
  }
  return slug || "dossier";
}

function parseArgs(argv) {
  const opts = { domain: [], topic: [], stack: [], supersedes: [] };
  const many = new Set(["domain", "topic", "stack", "supersedes"]);
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, "");
    if (["dry", "measurements"].includes(name)) { opts[name] = true; continue; }
    const value = argv[++i];
    if (value === undefined) throw new Error(`--${name} needs a value`);
    if (many.has(name)) opts[name].push(value);
    else opts[name] = value;
  }
  return opts;
}

function checkOptions(root, opts) {
  const problems = collector();
  const lists = loadTags(root, problems);
  if (!opts.title || opts.title.length < 8) problems.error("--title", "give a title of at least 8 characters");
  if (!opts.kind) problems.error("--kind", `pick one: ${[...lists.kind.keys()].join(", ")}`);
  if (!opts.domain.length) problems.error("--domain", "give at least one (the first is the main one)");
  if (!opts.topic.length) problems.error("--topic", "give at least one");
  for (const facet of FACETS) {
    for (const value of [opts[facet] ?? []].flat()) {
      const tag = lists[facet].get(value);
      if (!tag) problems.error(`--${facet}`, `"${value}" is not in tags/${facet}.json. Listed: ${[...lists[facet].keys()].join(", ")}`);
      else if (tag.retired) problems.error(`--${facet}`, `"${value}" is retired${tag.use_instead ? `: use "${tag.use_instead}"` : ""}`);
    }
  }
  if (opts.date && !validDate(opts.date)) problems.error("--date", "must be YYYY-MM-DD");
  return problems;
}

function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));
}

/** Creates the dossier. Returns { id, rel, files } or throws with every problem listed. */
export function newDossier(root, opts) {
  const problems = checkOptions(root, opts);
  const created = opts.date ?? now();
  const id = `${created}-${opts.slug ?? slugify(opts.title ?? "")}`;
  if (!ID.test(id) || id.length > 60) problems.error("--slug", `"${id}" is not a valid id: lower-case words joined by hyphens, 60 characters at most`);
  const existing = listDossiers(root);
  if (existing.some((d) => d.id === id)) problems.error("--slug", `${id} already exists: pick another --slug`);
  for (const old of opts.supersedes) if (!existing.some((d) => d.id === old)) problems.error("--supersedes", `${old} is not in the commons`);
  if (problems.errors.length) throw new Error(problems.errors.join("\n"));

  const rel = dossierPath(id), dir = join(root, rel), template = join(root, "templates", "dossier");
  const sections = JSON.parse(readFileSync(join(template, "sections.json"), "utf8"));
  const tags = { domain: opts.domain, topic: opts.topic, kind: opts.kind, stack: opts.stack };
  const quote = (s) => JSON.stringify(s).slice(1, -1);
  const values = {
    id, created, title: opts.title, question: opts.question ?? "[[fill: The one question this dossier answers.]]", kind: opts.kind,
    recheck: addMonths(created, RECHECK_MONTHS), kind_sections: sections[opts.kind] ?? "",
    tags: JSON.stringify(tags), supersedes: JSON.stringify(opts.supersedes),
    stores: JSON.stringify(opts.measurements || opts.kind === "benchmark" ? ["desk", "measurements"] : ["desk"]),
  };
  const files = walk(template).filter((f) => !SKIP.has(f) && (f !== "coverage.md" || opts.kind === "comparison"));
  if (opts.dry) return { id, rel, files };
  mkdirSync(dir, { recursive: true });
  for (const file of files) {
    let text = readFileSync(join(template, file), "utf8");
    const v = file.endsWith(".json") ? { ...values, title: quote(values.title), question: quote(values.question) } : values;
    text = fill(text, v).replace(/^<!--[\s\S]*?-->\n\n/gm, "");
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), file === "dossier.json" ? `${JSON.stringify(JSON.parse(text), null, 2)}\n` : text);
  }
  return { id, rel, files };
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let opts;
  try { opts = parseArgs(argv.slice(2)); } catch (err) { console.error(err.message); return 2; }
  try {
    const { rel, files } = newDossier(root, opts);
    console.log(`${opts.dry ? "Would write" : "Wrote"} ${rel}/ (${files.length} files):`);
    for (const file of files) console.log(`  ${file}`);
    if (!opts.dry) console.log(`Next: fill in every [[fill: ...]] blank, then run: node scripts/check.mjs --base origin/main`);
    return 0;
  } catch (err) {
    for (const line of err.message.split("\n")) console.error(`error: ${line}`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
