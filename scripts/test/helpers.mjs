// Test fixtures: a throwaway commons in a temp folder, with git, and a dossier filled in like a real one.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { newDossier } from "../new-dossier.mjs";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const TODAY = "2026-11-24";

export const sh = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** A temp commons with the real schemas, tag lists and template, committed on main. */
export function makeCommons() {
  const root = mkdtempSync(join(tmpdir(), "commons-"));
  for (const dir of ["schemas", "tags", "templates"]) cpSync(join(REPO, dir), join(root, dir), { recursive: true });
  sh(root, "init", "-q", "-b", "main");
  sh(root, "config", "user.email", "test@example.com");
  sh(root, "config", "user.name", "Test");
  commit(root, "start");
  return root;
}

export function commit(root, message) {
  sh(root, "add", "-A");
  sh(root, "commit", "-q", "--allow-empty", "-m", message);
}

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const save = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

/** Makes a dossier with the generator, then fills every blank so it passes the checker. */
export function addDossier(root, { title = "Which index format scales to ten thousand dossiers?", kind = "comparison", date = TODAY, slug, model = "claude-opus-5-5", checker = "claude-sonnet-5-5", ...rest } = {}) {
  const { id, rel } = newDossier(root, { title, kind, slug, date, domain: ["research"], topic: ["knowledge"], stack: [], supersedes: [], question: "Which index format scales to ten thousand dossiers?", ...rest });
  const dir = join(root, rel);
  const fill = (file) => writeFileSync(join(dir, file), readFileSync(join(dir, file), "utf8").replace(/\[\[fill:[^\]]*\]\]/g, "Filled in for the test."));
  for (const file of ["README.md", "hypotheses.md", "briefs/author.md", ...(kind === "comparison" ? ["coverage.md"] : [])]) fill(file);
  const card = json(join(dir, "dossier.json"));
  card.summary = "A generated index split by tag value stays readable at ten thousand dossiers.";
  save(join(dir, "dossier.json"), card);
  const record = json(join(dir, "provenance.json"));
  const role = (r, m, session) => Object.assign(r, { model: m, effort: "high", harness: "test harness 1.0", session, started: date, finished: date });
  role(record.roles[0], model, "author-session");
  role(record.roles[1], checker, "checker-session");
  save(join(dir, "provenance.json"), record);
  writeFileSync(join(dir, "sources.csv"), "id,title,location,accessed,read\ns1,A source,https://example.com/a,2026-11-24,full\n");
  writeFileSync(join(dir, "claims.csv"), "id,claim,label,sources,date\nc1,A claim.,read-in-source,s1,2026-11-24\n");
  writeFileSync(join(dir, "fact-check.csv"), "finding,claim,disposition,reason\nThe claim overstates the source.,c1,fixed,Reworded to match the source.\n");
  return { id, rel, dir };
}

export const editJson = (path, change) => { const value = json(path); change(value); save(path, value); };

/**
 * commonmark.js from the path in COMMONMARK (kept out of this repo's dependencies), or null when unset.
 * Works with the CommonJS build (dist/commonmark.js) and the ES module (lib/index.js).
 */
export async function loadCommonmark() {
  if (!process.env.COMMONMARK) return null;
  const mod = await import(pathToFileURL(resolve(process.env.COMMONMARK)).href);
  const commonmark = mod.Parser ? mod : mod.default;
  return { render: (markdown) => new commonmark.HtmlRenderer().render(new commonmark.Parser().parse(markdown)) };
}

/**
 * micromark with GFM from the node_modules folder in MICROMARK_GFM (kept out of this repo's
 * dependencies), or null when unset. Raw HTML is let through, as GitHub lets some through.
 */
export async function loadGfm() {
  if (!process.env.MICROMARK_GFM) return null;
  const from = (name) => import(pathToFileURL(join(resolve(process.env.MICROMARK_GFM), name, "index.js")).href);
  const { micromark } = await from("micromark");
  const { gfm, gfmHtml } = await from("micromark-extension-gfm");
  return { render: (markdown) => micromark(markdown, { extensions: [gfm()], htmlExtensions: [gfmHtml()], allowDangerousHtml: true }) };
}
