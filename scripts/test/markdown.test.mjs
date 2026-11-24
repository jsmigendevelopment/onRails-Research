// A property test of the dossier Markdown rules: random Markdown that the checker passes, rendered by
// CommonMark, has no comment, no HTML beyond what plain Markdown makes, and no hidden character once
// decoded. Rendering needs COMMONMARK (see helpers.mjs); without it the test still runs the checker.
import assert from "node:assert/strict";
import { test } from "node:test";
import { HIDDEN, scanText } from "../lib/hygiene.mjs";
import { collector } from "../lib/store.mjs";
import { loadCommonmark } from "./helpers.mjs";

const cp = (...codes) => String.fromCodePoint(...codes);
const TOKENS = [
  "a", "b", "word", " ", " ", "  ", "<", ">", "&", "#", "x202E", "8238", ";", "[", "]", "(", ")", "!", "`", "``", "```", "~~~",
  "$", "*", "_", "\"", "'", "\\", "-", "=", ":", "//x.example", "https://x.example/a", "\n", "\n", "\n\n", "> ", "- ", "1. ",
  "    ", "\t", "\r", "<!--", "-->", "&#x202E;", "&#8238;", "&amp;", "&nbsp;", "&lt;", "<span hidden>", "</span>", "<b>",
  "[t](u)", "[t]: u", "![i](u)", "](", "\"title\"", "<>", "&#", "&x;", cp(0x202e), cp(0xa0), cp(0x200b), cp(0xad),
];

/** A small seeded random generator, so a failure can be replayed. */
function random(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const TAGS = new Set(["p", "em", "strong", "code", "pre", "a", "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "br"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"" };
const decode = (html) => html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] !== "#" ? ENTITIES[e] ?? m : cp(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))));

const passes = (text) => {
  const problems = collector();
  scanText(text, "dossiers/2026/11/2026-11-24-x/notes.md", { hiddenText: true, markdown: true }, problems);
  return problems.errors.length === 0;
};

test("random dossier Markdown that passes renders with nothing hidden", async () => {
  const commonmark = await loadCommonmark();
  const next = random(20261124);
  let passed = 0;
  for (let i = 0; i < 20000; i++) {
    const text = Array.from({ length: 1 + Math.floor(next() * 30) }, () => TOKENS[Math.floor(next() * TOKENS.length)]).join("");
    if (!passes(text)) continue;
    passed++;
    if (!commonmark) continue;
    const html = commonmark.render(text);
    const where = `case ${i}: ${JSON.stringify(text)}\n${html}`;
    assert.ok(!html.includes("<!--"), where);
    for (const [, name] of html.matchAll(/<\/?([A-Za-z][A-Za-z0-9]*)/g)) assert.ok(TAGS.has(name.toLowerCase()), `<${name}> in ${where}`);
    assert.ok(!HIDDEN.test(decode(html.replace(/<[^>]*>/g, " "))), `hidden text in ${where}`);
    assert.ok(!HIDDEN.test(decode(html)), `hidden character in an attribute: ${where}`);
  }
  assert.ok(passed > 800, `only ${passed} random documents passed the checker: the test would prove little`);
});
