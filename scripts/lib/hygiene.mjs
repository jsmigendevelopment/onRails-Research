// What must never be in the commons: secrets, e-mail addresses, private paths and names, hidden text.
// Dossier text is untrusted input for every agent that later reads it, so hidden text is refused.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]*[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g;
const SAFE_EMAIL = /@(example\.(com|org|net)|users\.noreply\.github\.com)$|^git@/i;
const HOME_PATH = /(?:[A-Za-z]:[\\/]+Users[\\/]+|\/Users\/|\/home\/)([A-Za-z0-9._-]+)/g;
const SAFE_HOME = /^(user|username|you|me|name|runner|ubuntu|node|root|shared|public|default)$/i;
const HIDDEN = /[​-‏‪-‮⁠-⁤⁦-⁩\u{E0000}-\u{E007F}]|(?!^)﻿/u;
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

/** The private terms to refuse, from the PRIVATE_TERMS variable: one per line or comma. Never printed. */
export function privateTerms(env = process.env) {
  return (env.PRIVATE_TERMS ?? "").split(/[\n,]/).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3);
}

function scanLine(line, terms) {
  const found = [];
  for (const [name, pattern] of SECRETS) if (pattern.test(line)) found.push(`looks like ${name}: remove it, and revoke it if it is real`);
  if (line.includes("@") && line.length <= 20000)
    for (const match of line.match(EMAIL) ?? []) if (!SAFE_EMAIL.test(match)) found.push("has an e-mail address: remove it, or use an example.com address");
  for (const match of line.matchAll(HOME_PATH)) if (!SAFE_HOME.test(match[1])) found.push("has a path inside someone's home folder: write ~ or <home> instead");
  const lower = line.toLowerCase();
  terms.forEach((term, n) => { if (lower.includes(term)) found.push(`has private term #${n + 1} from the maintainer's list: remove it`); });
  return found;
}

/** Scans one text file. `hiddenText` also refuses invisible characters and HTML comments (for dossier files). */
export function scanText(text, where, { terms = [], hiddenText = false } = {}, problems) {
  text.split(/\r?\n/).forEach((line, n) => {
    for (const message of new Set(scanLine(line, terms))) problems.error(`${where}:${n + 1}`, message);
    if (!hiddenText) return;
    if (HIDDEN.test(line)) problems.error(`${where}:${n + 1}`, "has an invisible character (zero-width or text-direction control): remove it");
    if (where.endsWith(".md") && line.includes("<!--")) problems.error(`${where}:${n + 1}`, "has an HTML comment: readers can't see it, so it isn't allowed in a dossier");
  });
}
