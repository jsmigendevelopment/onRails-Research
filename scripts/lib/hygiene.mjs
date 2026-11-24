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

// Dossier Markdown is read by agents as well as people, so nothing in it may be invisible on the page:
// no link reference definitions and no raw HTML (tags or comments) outside code. Lines inside a fence
// are skipped; a line's code spans are skipped unless it has an escaped backtick, which can end one.
const CONTAINER = /^(?:[ \t]*(?:>|[-*+]|\d{1,9}[.)])(?=[ \t]|$))*[ \t]*/;
const REF_DEF = /^\[(?:[^\]\\]|\\.)+\]:/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const SPAN = /(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;
const TAG = /<[A-Za-z/!?]/;
export const REF_MESSAGE = "has a link reference definition: readers can't see it, so it isn't allowed in a dossier. Write the link inline";
export const HTML_MESSAGE = "has raw HTML (a tag or an HTML comment): it can hide text, so it isn't allowed in a dossier. Put it in `code`, or write plain Markdown";

/** Reports hidden Markdown in one dossier Markdown file. */
export function scanMarkdown(text, where, problems) {
  let fence = null;
  text.split(/\r\n|\r|\n/).forEach((line, n) => {
    const inner = line.replace(CONTAINER, "");
    const open = FENCE.exec(inner);
    if (fence) {
      const close = CLOSE.exec(inner);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      return;
    }
    if (open) { fence = open[1]; return; }
    if (REF_DEF.test(inner)) problems.error(`${where}:${n + 1}`, REF_MESSAGE);
    if (TAG.test(line.includes("\\`") ? line : line.replace(SPAN, ""))) problems.error(`${where}:${n + 1}`, HTML_MESSAGE);
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
