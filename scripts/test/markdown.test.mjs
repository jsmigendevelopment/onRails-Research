// Property tests of the dossier Markdown rules: random Markdown that the checker passes, rendered by
// CommonMark and by GFM, has no comment, no HTML beyond what plain Markdown makes, no hidden character
// once decoded, and every table cell of the source on the page. Rendering needs COMMONMARK and
// MICROMARK_GFM (see helpers.mjs); without them the tests still run the checker.
import assert from "node:assert/strict";
import { test } from "node:test";
import { HIDDEN, scanText } from "../lib/hygiene.mjs";
import { collector } from "../lib/store.mjs";
import { loadCommonmark, loadGfm } from "./helpers.mjs";

const cp = (...codes) => String.fromCodePoint(...codes);
const TOKENS = [
  "a", "b", "word", " ", " ", "  ", "<", ">", "&", "#", "x202E", "8238", ";", "[", "]", "(", ")", "!", "`", "``", "```", "~~~",
  "$", "*", "_", "\"", "'", "\\", "-", "=", ":", "//x.example", "https://x.example/a", "\n", "\n", "\n\n", "> ", "- ", "1. ",
  "    ", "\t", "\r", "<!--", "-->", "&#x202E;", "&#8238;", "&amp;", "&nbsp;", "&lt;", "<span hidden>", "</span>", "<b>",
  "[t](u)", "[t]: u", "![i](u)", "](", "\"title\"", "<>", "&#", "&x;", "|", " | ", "\\|", "| --- |", "---|---", ":-:", "\n| a | b |\n|---|---|\n",
  "~~", "- [ ] ", "www.x.example", "[^1]", "```mermaid\n", "```text\n", cp(0x202e), cp(0xa0), cp(0x200b), cp(0xad),
];

/** A small seeded random generator, so a failure can be replayed. */
function random(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const TAGS = new Set(["p", "em", "strong", "code", "pre", "a", "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "br",
  "table", "thead", "tbody", "tr", "th", "td", "del", "input"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"" };
const decode = (html) => html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] !== "#" ? ENTITIES[e] ?? m : cp(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))));

const passes = (text) => {
  const problems = collector();
  scanText(text, "dossiers/2026/11/2026-11-24-x/notes.md", { hiddenText: true, markdown: true }, problems);
  return problems.errors.length === 0;
};

test("random dossier Markdown that passes renders with nothing hidden", async () => {
  const renderers = [await loadCommonmark(), await loadGfm()].filter(Boolean);
  const next = random(20261124);
  let passed = 0;
  for (let i = 0; i < 20000; i++) {
    const text = Array.from({ length: 1 + Math.floor(next() * 30) }, () => TOKENS[Math.floor(next() * TOKENS.length)]).join("");
    if (!passes(text)) continue;
    passed++;
    for (const renderer of renderers) {
      const html = renderer.render(text);
      const where = `case ${i}: ${JSON.stringify(text)}\n${html}`;
      assert.ok(!html.includes("<!--"), where);
      for (const [, name] of html.matchAll(/<\/?([A-Za-z][A-Za-z0-9]*)/g)) assert.ok(TAGS.has(name.toLowerCase()), `<${name}> in ${where}`);
      assert.ok(!HIDDEN.test(decode(html.replace(/<[^>]*>/g, " "))), `hidden text in ${where}`);
      assert.ok(!HIDDEN.test(decode(html)), `hidden character in an attribute: ${where}`);
      assert.ok(!/class="language-(?!(text|txt|json|csv|js|mjs|ts|sh|bash|py|toml|yaml|yml|diff|md)")/.test(html), `a fence language off the list: ${where}`);
    }
  }
  assert.ok(passed > 800, `only ${passed} random documents passed the checker: the test would prove little`);
});

const CELL_BITS = ["", " ", "|", "\\|", "\\\\|", "`", "``", "*", "_", "~", "x", "-", ":"];

test("tighter tables: every cell of a table that passes is on the page", async () => {
  const gfm = await loadGfm();
  const next = random(7);
  const pick = (list) => list[Math.floor(next() * list.length)];
  let passed = 0, id = 0;
  for (let i = 0; i < 4000; i++) {
    const width = 1 + Math.floor(next() * 4);
    const cell = () => `${pick(CELL_BITS)} c${++id}q ${pick(CELL_BITS)}`;
    const row = (n) => `${next() < 0.5 ? "| " : ""}${Array.from({ length: n }, cell).join(" | ")}${next() < 0.5 ? " |" : ""}`;
    const rows = Array.from({ length: 1 + Math.floor(next() * 3) }, () => row(Math.max(1, width + pick([-1, 0, 0, 0, 1]))));
    const text = [row(width), Array.from({ length: width }, () => "---").join(" | ").replace(/^/, "| ").concat(" |"), ...rows].join("\n") + "\n";
    if (!passes(text)) continue;
    passed++;
    if (!gfm) continue;
    const html = gfm.render(text);
    for (const [cellId] of text.matchAll(/c\d+q/g)) assert.ok(html.includes(cellId), `${cellId} is not on the page:\n${text}\n${html}`);
  }
  assert.ok(passed > 300, `only ${passed} random tables passed the checker`);
});
