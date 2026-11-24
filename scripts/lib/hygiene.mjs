// What must never be in the commons: secrets, e-mail addresses, private paths and names, hidden text.
// Dossier text is untrusted input for every agent that later reads it, so hidden text is refused.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]*[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g;
// Example addresses, GitHub noreply addresses, git remotes, and image names such as icon@2x.png.
const SAFE_EMAIL = /@(example\.(com|org|net)|users\.noreply\.github\.com)$|^git@|\.(png|jpe?g|gif|svg|webp|avif|ico|pdf)$/i;
const HOME_PATH = /(?:[A-Za-z]:[\\/]+Users[\\/]+|\/Users\/|\/home\/)([A-Za-z0-9._-]+)/g;
const SAFE_HOME = /^(user|username|you|me|name|runner|ubuntu|node|root|shared|public|default)$/i;
// Characters a reader can't see, by Unicode category: format (Cf), private use (Co), unassigned (Cn),
// line and paragraph separators, every space but U+0020, variation selectors (U+FE0F only right after
// an emoji), default-ignorable code points, blank Braille and the fillers and invisible operators that
// render as nothing.
export const HIDDEN = /[\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\u00AD\u115F\u1160\u17B4\u17B5\u2800\u3164\uFFA0\u180B-\u180F\uFFF9-\uFFFB\uFE00-\uFE0E\u{E0100}-\u{E01EF}]|(?!\uFE0F)\p{Default_Ignorable_Code_Point}|(?! )\p{Zs}|(?<!\p{Extended_Pictographic})\uFE0F/u;
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
// A fence opens only at the very start of a line, with at most a plain word after it, and closes the
// way CommonMark closes it. Anything else that CommonMark could read as a fence (indented, after a quote
// or list marker, or with another info string) is refused, so this reading never drifts from CommonMark's.
const OPEN = /^(`{3,}|~{3,})[A-Za-z0-9+._-]*[ \t]*$/;
const FENCE_LIKE = /^(?:[ \t]*(?:>|[-*+]|\d{1,9}[.)]))*[ \t]*(`{3,}|~{3,})/;
const ROOT_OPEN = /^ {0,3}(`{3,}(?!.*`)|~{3,})/;
const CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
export const FENCE_MESSAGE = "looks like a code fence that doesn't start the line or has more than a plain word after it: start fences at the very start of a line, as ``` or ```js";
export const MARKDOWN_RULES = [
  [/</, "has a < character: it can start HTML or a comment. Put code that needs it in a fenced block"],
  [/&(#|[A-Za-z][A-Za-z0-9]*;)/, "has a character reference (&#...; or &name;): write the character itself"],
  [/\]:/, "has ]:, which can start a link reference definition: write links inline"],
  [/^(?: {0,3}>)* {0,3}\[[^\]]*$/, "starts with [ and doesn't close it on the same line: keep a link's text on one line"],
  [/\$/, "has a $ character: math isn't allowed; write the amount in words, such as 20 dollars"],
  [/!\[/, "has an image (![): link to it instead"],
  [/\]\([^)]*[ \t]["'(]/, "has a link title: write the link as [text](url) only"],
  [/\]\([^)]*$/, "has a link that doesn't close on the same line: keep [text](url) on one line"],
];
const SPAN_RUNS = /`+/g;
export const SPAN_MESSAGE = "has a code span that doesn't close on the same line: keep each `code` on one line";

/** Reports hidden Markdown in one dossier Markdown file. */
export function scanMarkdown(text, where, problems) {
  let fence = null;
  text.split(/\r\n|\r|\n/).forEach((line, n) => {
    if (fence) {
      const close = CLOSE.exec(line);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      return;
    }
    const open = OPEN.exec(line);
    if (open) { fence = open[1]; return; }
    if (FENCE_LIKE.test(line)) {
      problems.error(`${where}:${n + 1}`, FENCE_MESSAGE);
      // The file fails either way; follow CommonMark's fence so the lines after it are read as it reads them.
      const root = ROOT_OPEN.exec(line);
      if (root) { fence = root[1]; return; }
    }
    for (const [rule, message] of MARKDOWN_RULES) if (rule.test(line)) problems.error(`${where}:${n + 1}`, message);
    if ((line.match(SPAN_RUNS) ?? []).length % 2) problems.error(`${where}:${n + 1}`, SPAN_MESSAGE);
  });
}

/** Scans one text file. `hiddenText` also refuses invisible characters; `markdown` refuses hidden Markdown (dossier files). */
export function scanText(text, where, { terms = [], hiddenText = false, markdown = false, onTerm } = {}, problems) {
  // Once per file, with no line number and no term: the log of a fork's run is public, and a line or
  // an index would tell a stranger which of their guesses is on the list.
  const lower = text.toLowerCase();
  if (terms.some((term) => lower.includes(term))) (onTerm ?? (() => problems.error(where, PRIVATE_TERM)))();
  text.split(/\r?\n/).forEach((line, n) => {
    for (const message of new Set(scanLine(line))) problems.error(`${where}:${n + 1}`, message);
    if (hiddenText && HIDDEN.test(line)) problems.error(`${where}:${n + 1}`, "has an invisible character (a format, private-use, unassigned, separator or filler character, or a space other than U+0020): remove it");
  });
  if (markdown) scanMarkdown(text, where, problems);
}
