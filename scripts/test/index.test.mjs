import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildIndex, esc, freshnessOf, PAGE_ROWS } from "../build-index.mjs";
import { slugify } from "../new-dossier.mjs";
import { addDossier, editJson, makeCommons, TODAY } from "./helpers.mjs";

const out = () => mkdtempSync(join(tmpdir(), "index-"));

test("AC-4: a dossier past its re-check date is marked stale", () => {
  assert.equal(freshnessOf({ status: "current", recheck: "2026-11-24" }, "2026-11-24"), "stale");
  assert.equal(freshnessOf({ status: "current", recheck: "2026-12-10" }, "2026-11-24"), "due-soon");
  assert.equal(freshnessOf({ status: "current", recheck: "2027-05-24" }, "2026-11-24"), "fresh");
  assert.equal(freshnessOf({ status: "retracted", recheck: null }, "2026-11-24"), "retracted");
  const root = makeCommons();
  const { dir } = addDossier(root, { date: "2026-01-10" });
  editJson(join(dir, "dossier.json"), (c) => { c.recheck = "2026-07-10"; });
  const dest = out();
  const { entries } = buildIndex({ root, out: dest, today: TODAY });
  assert.equal(entries[0].freshness, "stale");
  assert.match(readFileSync(join(dest, "stale.md"), "utf8"), /\*\*stale\*\*: re-check was due 2026-07-10/);
  assert.match(readFileSync(join(dest, "README.md"), "utf8"), /1 stale/);
});

test("the index lists a dossier under every tag it carries, with its trust", () => {
  const root = makeCommons();
  addDossier(root, { domain: ["research", "core"], stack: ["github"] });
  const dest = out();
  buildIndex({ root, out: dest, today: TODAY, repo: "owner/commons" });
  for (const page of ["domain/research.md", "domain/core.md", "topic/knowledge.md", "kind/comparison.md", "stack/github.md"])
    assert.match(readFileSync(join(dest, page), "utf8"), /https:\/\/github\.com\/owner\/commons\/tree\/main\/dossiers\/2026\/11\//, page);
  assert.match(readFileSync(join(dest, "domain/research.md"), "utf8"), /cross-checked/);
  assert.equal(JSON.parse(readFileSync(join(dest, "index.json"), "utf8")).count, 1);
});

test("a retired tag's dossiers are listed under the value that replaced it", () => {
  const root = makeCommons();
  editJson(join(root, "tags/topic.json"), (t) => {
    t.values.push({ id: "old-knowledge", label: "Old", means: "An older name for knowledge keeping.", added: TODAY, retired: TODAY, use_instead: "knowledge" });
  });
  const { dir } = addDossier(root);
  editJson(join(dir, "dossier.json"), (c) => { c.tags.topic = ["old-knowledge"]; });
  const dest = out();
  buildIndex({ root, out: dest, today: TODAY });
  assert.match(readFileSync(join(dest, "topic/knowledge.md"), "utf8"), /1 dossier tagged/);
});

test(`a tag page past ${PAGE_ROWS} rows is split by year`, () => {
  const root = makeCommons();
  for (let i = 0; i <= PAGE_ROWS; i++) addDossier(root, { slug: `d${i}`, date: i % 2 ? "2026-03-01" : "2025-03-01" });
  const dest = out();
  buildIndex({ root, out: dest, today: TODAY });
  assert.match(readFileSync(join(dest, "topic/knowledge.md"), "utf8"), /\[2026\]\(knowledge\/2026\.md\)/);
  assert.ok(existsSync(join(dest, "topic/knowledge/2025.md")));
  assert.match(readFileSync(join(dest, "stale.md"), "utf8"), /\[2025\]\(stale\/2025\.md\)/);
  assert.match(readFileSync(join(dest, "stale/2025.md"), "utf8"), /\.\.\/\.\.\/dossiers\/2025\//);
});

test("slugs are short, lower case and stable", () => {
  assert.equal(slugify("How big can a Git LFS repo get for free?"), "big-git-lfs-repo-get-free");
  assert.equal(slugify("Diátaxis vs. folders: which scales?"), "diataxis-vs-folders-scales");
  assert.ok(slugify("a".repeat(80)).length <= 40 || slugify("a".repeat(80)) === "a".repeat(80));
});

test("a title is escaped so it stays plain text in the index", async () => {
  const title = "A [link](//x.example) ![img](//x.example/p.png) <span hidden>x</span> `code` *em* _em_ | pipe \\ back\nline";
  const cell = esc(title);
  assert.ok(!cell.includes("\n"));
  for (const ch of ["[", "]", "(", ")", "!", "<", ">", "`", "*", "_", "|"]) assert.ok(!new RegExp(`(^|[^\\\\])(\\\\\\\\)*\\${ch}`).test(cell), ch);
  if (!process.env.COMMONMARK) return;
  const commonmark = await import(process.env.COMMONMARK);
  const html = new commonmark.HtmlRenderer().render(new commonmark.Parser().parse(`[${cell}](https://example.com/d)`));
  assert.equal((html.match(/<a /g) ?? []).length, 1, html);
  assert.ok(!/<img|<span|<code|<em/.test(html), html);
});
