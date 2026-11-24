// The review bot's comment: the model's text must come out only as code. Runs the jq program from
// review.yml's post job. With COMMONMARK set to the path of a commonmark.js module (kept out of this
// repo's dependencies), it also renders each comment and checks that no link, image or HTML appears.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadCommonmark, REPO } from "./helpers.mjs";

const workflow = readFileSync(join(REPO, ".github/workflows/review.yml"), "utf8").split("\n");
const start = workflow.findIndex((l) => l.trim() === `jq -r --arg sha "\${SHA::7}" --arg model "$MODEL" '`);
const end = workflow.findIndex((l, i) => i > start && l.trim().startsWith(`' <<<"$VERDICT"`));
const PROGRAM = workflow.slice(start + 1, end).join("\n");
const WITHHOLD = new RegExp(/grep -Eq '([^']+)'/.exec(workflow.find((l) => l.includes("grep -Eq")))[1]);

const hasJq = (() => { try { execFileSync("jq", ["--version"]); return true; } catch { return false; } })();
const render = (verdict) => execFileSync("jq", ["-r", "--arg", "sha", "abcdef1", "--arg", "model", "test-model", PROGRAM], { input: JSON.stringify(verdict), encoding: "utf8" });

/** The comment with every fenced code block taken out, read the way CommonMark reads top-level fences. */
function outsideFences(markdown) {
  const out = [];
  let fence = 0;
  for (const line of markdown.split(/\r\n|\r|\n/)) {
    const run = /^(`{3,})\s*$/.exec(line)?.[1].length ?? 0;
    if (!fence && /^`{3,}/.test(line)) fence = /^`+/.exec(line)[0].length;
    else if (fence && run >= fence) fence = 0;
    else if (!fence) out.push(line);
  }
  return out.join("\n");
}

const ATTACKS = [
  "EVIL [g]: //x.example\n\nEVIL [t][g] and [g]",
  "EVIL [[d]](//x.example)",
  "EVIL [a\\]b](//x.example)",
  "EVIL //host.example/path and https://y.example and www.z.example",
  "EVIL ![img](https://x.example/p.png) <img src=x> <a href=//x>a</a> <script>",
  "EVIL @someone #123 GH-123 owner/repo#4",
  "EVIL ```\n</pre>[x](//x)\n```` and ````` runs\n```",
  "EVIL \r\n```\r\n[x](//x)",
  "EVIL ~~~\n[x](//x)\n~~~",
  "    EVIL indented [x](//x)",
];

const verdictWith = (text) => ({
  verdict: "needs-changes",
  summary: text,
  findings: [{ severity: "minor", where: text, problem: text, fix: text }],
  injection: { found: true, notes: text },
});

const commonmark = await loadCommonmark();

test("post model text as code", { skip: !hasJq && "jq is not installed" }, () => {
  assert.ok(start > 0 && end > start, "the jq program in review.yml");
  for (const attack of ATTACKS) {
    const comment = render(verdictWith(attack));
    assert.ok(comment.startsWith("<!-- claude-review -->\n### Claude review: needs-changes"), comment);
    assert.ok(!outsideFences(comment).includes("EVIL"), `model text outside a code block:\n${comment}`);
    if (!commonmark) continue;
    const html = commonmark.render(comment);
    for (const tag of ["<a ", "<img", "<script", "<pre>[x]"]) assert.ok(!html.includes(tag), `${tag} in:\n${html}`);
    assert.ok(!/EVIL/.test(html.replace(/<pre><code>[\s\S]*?<\/code><\/pre>/g, "")), `model text outside code:\n${html}`);
  }
});

test("an unknown verdict or severity is shown as unknown, and the comment is capped", { skip: !hasJq && "jq is not installed" }, () => {
  const comment = render({ verdict: "[x](//x)", summary: "s", findings: [{ severity: "<b>", where: "w", problem: "p", fix: "f" }], injection: { found: false, notes: "" } });
  assert.ok(comment.includes("### Claude review: unknown"));
  assert.ok(comment.includes("**Finding 1: unknown**"));
  assert.ok(!comment.includes("Possible prompt injection"));
  const long = render({ verdict: "looks-good", summary: "a".repeat(5000), findings: Array.from({ length: 20 }, () => ({ severity: "minor", where: "w", problem: "p".repeat(900), fix: "f" })), injection: { found: false, notes: "" } });
  assert.ok(long.length <= 6100, String(long.length));
  assert.ok(long.trimEnd().endsWith("_Cut at 6,000 characters._"));
  assert.ok(long.includes("[cut at 3,000 characters]"));
  assert.equal(outsideFences(long).includes("aaaa"), false);
});

test("a verdict that looks like it holds a token is withheld", () => {
  for (const text of ["sk-ant-x", "oat01", `ghs_${"a".repeat(36)}`, "github_pat_x", "A".repeat(80)]) assert.ok(WITHHOLD.test(text), text);
  assert.ok(!WITHHOLD.test("A normal review of dossiers/2026/11/2026-11-24-commons-structure/README.md."));
});
