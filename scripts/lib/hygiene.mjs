import { parseCsv } from "./csv.mjs";

// What must never be in the commons: secrets, e-mail addresses, private paths and names, hidden text.
// Dossier text is untrusted input for every agent that later reads it, so hidden text is refused.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]*[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g;
// Example addresses, GitHub noreply addresses, git remotes, and image names such as icon@2x.png.
const SAFE_EMAIL = /@(example\.(com|org|net)|users\.noreply\.github\.com)$|^git@|\.(png|jpe?g|gif|svg|webp|avif|ico|pdf)$/i;
const HOME_PATH = /(?:[A-Za-z]:[\\/]+Users[\\/]+|\/Users\/|\/home\/)([A-Za-z0-9._-]+)/g;
const SAFE_HOME = /^(user|username|you|me|name|runner|ubuntu|node|root|shared|public|default)$/i;
// Characters a reader can't see, by Unicode category: format (Cf), private use (Co), unassigned (Cn),
// line and paragraph separators, every space but U+0020, variation selectors (U+FE0F only right after
// an emoji), C0 and C1 controls but tab, LF and CR, default-ignorable code points, blank Braille, and
// the fillers, placeholders and invisible operators that render as nothing or as an empty box.
export const HIDDEN = /[\u{16FE4}\u{1D159}\uFFFC\u3030\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\u00AD\u115F\u1160\u17B4\u17B5\u2800\u3164\uFFA0\u180B-\u180F\uFFF9-\uFFFB\uFE00-\uFE0E\u{E0100}-\u{E01EF}]|(?!\uFE0F)\p{Default_Ignorable_Code_Point}|(?! )\p{Zs}|(?<!\p{Extended_Pictographic})\uFE0F/u;
const SECRETS = [
  ["a private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["a GitHub token", /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/],
  ["an Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["an OpenAI key", /\bsk-(proj-)?[A-Za-z0-9_-]{40,}/],
  ["an AWS access key", /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["a Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["a Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["a Stripe live key", /\b[sr]k_live_[0-9A-Za-z]{20,}/],
  ["an npm token", /\bnpm_[A-Za-z0-9]{36}\b/],
  ["a Hugging Face token", /\bhf_[A-Za-z0-9]{30,}\b/],
  ["a JSON web token", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/],
];

export const PRIVATE_TERM = "has a private term";

/** The private terms to refuse, from the PRIVATE_TERMS variable: one per line or comma. Never printed. */
export function privateTerms(env = process.env) {
  return (env.PRIVATE_TERMS ?? "").split(/[\n,]/).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3);
}

function scanLine(line) {
  const found = [];
  for (const [name, pattern] of SECRETS) if (pattern.test(line)) found.push(`looks like ${name}: remove it, and revoke it if it is real`);
  if (line.includes("@") && line.length <= 20000)
    for (const match of line.match(EMAIL) ?? []) if (!SAFE_EMAIL.test(match)) found.push("has an e-mail address: remove it, or use an example.com address");
  for (const match of line.matchAll(HOME_PATH)) if (!SAFE_HOME.test(match[1])) found.push("has a path inside someone's home folder: write ~ or <home> instead");
  return found;
}

// Dossier Markdown is read by agents as well as people, so nothing in it may be hidden on the page.
// The rules are flat, per line and per character, so no Markdown construct split across lines can slip
// past them. Outside fenced code: no `<` at all (no HTML, comments or autolinks), no character
// references, no reference definitions, no math, no images, no link titles, no link that doesn't close
// on its line, and every code span closes on its line. Inside a fence only the character rules apply.
// A fence opens only at the very start of a line, with no info string or one from a short list of
// plain languages, and closes the way CommonMark closes it. Anything else that CommonMark could read as
// a fence (indented, after a quote or list marker, or with another info string, which GitHub may render
// as a diagram, map, model or math) is refused, so this reading never drifts from CommonMark's.
export const FENCE_LANGUAGES = ["text", "txt", "json", "csv", "js", "mjs", "ts", "sh", "bash", "py", "toml", "yaml", "yml", "diff", "md"];
const OPEN = new RegExp(`^(\`{3,}|~{3,})(?:${FENCE_LANGUAGES.join("|")})?[ \\t]*$`);
const FENCE_LIKE = /^(?:[ \t]*(?:>|[-*+]|\d{1,9}[.)]))*[ \t]*(`{3,}|~{3,})/;
const ROOT_OPEN = /^ {0,3}(`{3,}(?!.*`)|~{3,})/;
const CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
export const FENCE_MESSAGE = `looks like a code fence that doesn't start the line, or names a language not on the list: start fences at the very start of a line, as \`\`\` or \`\`\`text (allowed: ${FENCE_LANGUAGES.join(", ")})`;
export const MARKDOWN_RULES = [
  [/</, "has a < character: it can start HTML or a comment. Put code that needs it in a fenced block"],
  [/&(#|[A-Za-z][A-Za-z0-9]*;)/, "has a character reference (&#...; or &name;): write the character itself"],
  [/\]:/, "has ]:, which can start a link reference definition: write links inline"],
  [/^(?: {0,3}>)* {0,3}\[[^\]]*$/, "starts with [ and doesn't close it on the same line: keep a link's text on one line"],
  [/\$/, "has a $ character: math isn't allowed; write the amount in words, such as 20 dollars"],
  [/!\[/, "has an image (![): link to it instead"],
];
// The only link form allowed: some text, then an address with no space, parenthesis, angle bracket or
// backslash, and link text with no brackets in it. Any other ]( (a title, a split link, empty text,
// nested brackets) is refused.
const LINK = /\[[^\[\]]*[^\s\[\]][^\[\]]*\]\([^\s()<>\\]+\)/g;
export const LINK_MESSAGE = "has a link that isn't plain [text](address) on one line, with some text and an address without spaces, brackets or backslashes: write it as [text](https://...)";
// Every scanned text file, fences included: no line so long, or space so wide, that text sits off-screen.
export const LAYOUT_RULES = [
  [/^.{2001}/, "is longer than 2,000 characters: break it up"],
  [/ {20}/, "has a run of 20 or more spaces: text can hide off-screen after it"],
  [/\S.*\t/, "has a tab after text: use spaces"],
];
const SPAN_RUNS = /`+/g;
export const SPAN_MESSAGE = "has a code span that doesn't close on the same line: keep each `code` on one line";

// GFM tables: a row with more cells than its header drops the extra cells from the page. Every row of a
// table must have exactly as many cells as its header. Cells are split on every pipe not escaped by an
// odd number of backslashes, inside code spans too, as GFM splits them.
const QUOTED = /^(?:[ \t]*>)*[ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?/;
const DELIMITER = /^\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const PIPE = /(?<=(?:^|[^\\])(?:\\\\)*)\|/g;
export const TABLE_MESSAGE = "is a table row with a different number of cells from its header: give every row exactly as many cells as the header";

/** The number of cells GFM finds in a table row. */
export function cellCount(row) {
  let text = row.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (/(?:^|[^\\])(?:\\\\)*\|$/.test(text)) text = text.slice(0, -1);
  return (text.match(PIPE) ?? []).length + 1;
}

// Code in a fence doesn't wrap, so its lines are short. A brief keeps its prompt word for word in a fence,
// so its lines may be as long as any other (2,000 characters).
const FENCE_LINE = 200;
export const FENCE_LINE_MESSAGE = `is a line in a code fence longer than ${FENCE_LINE} characters: code doesn't wrap, so break it up`;

/** Reports hidden Markdown in one dossier Markdown file. */
export function scanMarkdown(text, where, problems) {
  const fenceLimit = !/(^|\/)briefs\/[^/]+$/.test(where);
  let fence = null, columns = 0, previous = "";
  text.split(/\r\n|\r|\n/).forEach((line, n) => {
    const at = `${where}:${n + 1}`;
    if (fence) {
      if (fenceLimit && line.length > FENCE_LINE) problems.error(at, FENCE_LINE_MESSAGE);
      const close = CLOSE.exec(line);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      return;
    }
    const inner = line.replace(QUOTED, "");
    if (columns && !inner.trim()) columns = 0;
    const open = OPEN.exec(line);
    if (open) { fence = open[1]; columns = 0; previous = ""; return; }
    if (FENCE_LIKE.test(line)) {
      problems.error(at, FENCE_MESSAGE);
      // The file fails either way; follow CommonMark's fence so the lines after it are read as it reads them.
      const root = ROOT_OPEN.exec(line);
      if (root) { fence = root[1]; columns = 0; return; }
    }
    for (const [rule, message] of MARKDOWN_RULES) if (rule.test(line)) problems.error(at, message);
    if ((line.match(SPAN_RUNS) ?? []).length % 2) problems.error(at, SPAN_MESSAGE);
    if (line.replace(LINK, "").includes("](")) problems.error(at, LINK_MESSAGE);
    if (columns) { if (cellCount(inner) !== columns) problems.error(at, TABLE_MESSAGE); }
    else if (inner.includes("|") && DELIMITER.test(inner.trim()) && previous.trim() && cellCount(inner) === cellCount(previous)) columns = cellCount(inner);
    previous = inner;
  });
}

/** The keys that appear twice in one JSON object: JSON.parse keeps only the last, so the first hides. */
export function duplicateKeys(text) {
  const stack = [], found = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], top = stack[stack.length - 1];
    if (ch === "{") stack.push({ keys: new Set(), key: true });
    else if (ch === "[") stack.push(null);
    else if (ch === "}" || ch === "]") stack.pop();
    else if (ch === ":" && top) top.key = false;
    else if (ch === "," && top) top.key = true;
    else if (ch === '"') {
      let end = i + 1;
      while (end < text.length && text[end] !== '"') end += text[end] === "\\" ? 2 : 1;
      if (top?.key) {
        const key = JSON.parse(text.slice(i, end + 1));
        if (top.keys.has(key)) found.push(key);
        top.keys.add(key);
      }
      i = end;
    }
  }
  return found;
}

/** Reports a CSV row whose cell count differs from the header's: a reader of the table drops or invents cells. */
export function scanCsvRows(text, where, problems) {
  const rows = parseCsv(text).filter((row, n, all) => !(n === all.length - 1 && row.length === 1 && row[0] === ""));
  const width = rows[0]?.length ?? 0;
  rows.forEach((row, n) => { if (n && row.length !== width) problems.error(`${where}: row ${n}`, `has ${row.length} cells, but the header has ${width}: every row has exactly as many cells as the header`); });
}

/** Reports an invisible character inside any string of a JSON file, as JSON can spell one as an escape. */
export function scanJsonStrings(text, where, problems) {
  let value;
  try { value = JSON.parse(text); } catch { return; }
  for (const key of new Set(duplicateKeys(text))) problems.error(where, `has the key ${JSON.stringify(key)} twice in one object: JSON keeps only the last, so remove the other`);
  const strings = [];
  const walk = (v) => {
    if (typeof v === "string") strings.push(v);
    else if (v && typeof v === "object") for (const [key, inner] of Object.entries(v)) { strings.push(key); walk(inner); }
  };
  walk(value);
  if (strings.some((s) => HIDDEN.test(s))) problems.error(where, "has an invisible character inside a JSON string (it may be written as an escape): remove it");
}

/** Scans one text file. `hiddenText` also refuses invisible characters; `markdown` refuses hidden Markdown (dossier files). */
export function scanText(text, where, { terms = [], hiddenText = false, markdown = false, layout = false, onTerm } = {}, problems) {
  if (hiddenText && /\.json$/i.test(where)) scanJsonStrings(text, where, problems);
  if (hiddenText && /\.csv$/i.test(where)) scanCsvRows(text, where, problems);
  // Once per file, with no line number and no term: the log of a fork's run is public, and a line or
  // an index would tell a stranger which of their guesses is on the list.
  const lower = text.toLowerCase();
  if (terms.some((term) => lower.includes(term))) (onTerm ?? (() => problems.error(where, PRIVATE_TERM)))();
  text.split(/\r\n|\r|\n/).forEach((line, n) => {
    for (const message of new Set(scanLine(line))) problems.error(`${where}:${n + 1}`, message);
    if (layout) for (const [rule, message] of LAYOUT_RULES) if (rule.test(line)) problems.error(`${where}:${n + 1}`, message);
    if (hiddenText && HIDDEN.test(line)) problems.error(`${where}:${n + 1}`, "has an invisible character (a format, private-use, unassigned, separator or filler character, or a space other than U+0020): remove it");
  });
  if (markdown) scanMarkdown(text, where, problems);
}
