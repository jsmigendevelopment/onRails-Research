#!/usr/bin/env node
// Flow numbers for the retro and the pass gate: how many steps merged, how long one takes,
// and the longest stretch with no merge. It reads the JSON the coordinator already fetched
// and makes no API calls of its own. No dependencies.
//   gh pr list --state merged --limit 200 --json number,title,createdAt,mergedAt,additions,deletions,headRefName > <tmp>/merged.json
//   gh issue list --state all --limit 200 --json number,createdAt > <tmp>/issues.json     (optional: adds issue to merge)
//   node flow.mjs --github <tmp>/merged.json [--github <tmp>/issues.json] [--days 7] [--json]
// --now <ISO time> sets the clock (for tests).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HOUR = 36e5;
const round = (n) => (n === null ? null : Math.round(n * 10) / 10);

/** The value at or under which `share` of the sorted numbers fall (nearest rank), or null. */
export function percentile(numbers, share) {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)];
}
export const median = (numbers) => {
  if (!numbers.length) return null;
  const s = [...numbers].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// The issue a pull request closes, from its branch: feat/12-notes-list, fix/7-typo.
const issueOf = (pr) => Number(String(pr.headRefName ?? "").match(/^(?:feat|fix|chore)\/(\d+)-/)?.[1]) || null;

/** Flow numbers for the pull requests merged in the last `days` days. Times are in hours. */
export function flow(items, { days = 7, now = new Date() } = {}) {
  const end = now.getTime();
  const start = end - days * 24 * HOUR;
  const issues = new Map(items.filter((i) => !("mergedAt" in i) && i.createdAt).map((i) => [i.number, Date.parse(i.createdAt)]));
  const merged = items.filter((i) => i.mergedAt).map((pr) => ({ ...pr, at: Date.parse(pr.mergedAt), opened: Date.parse(pr.createdAt) }))
    .filter((pr) => pr.at >= start && pr.at <= end).sort((a, b) => a.at - b.at);
  const cycle = merged.filter((pr) => Number.isFinite(pr.opened)).map((pr) => ({ number: pr.number, hours: (pr.at - pr.opened) / HOUR }));
  const lead = merged.map((pr) => issues.get(issueOf(pr))).map((created, n) => (created ? (merged[n].at - created) / HOUR : null)).filter((h) => h !== null);
  const gaps = merged.slice(1).map((pr, n) => ({ from: merged[n].mergedAt, to: pr.mergedAt, hours: (pr.at - merged[n].at) / HOUR }));
  const longest = gaps.reduce((worst, g) => (!worst || g.hours > worst.hours ? g : worst), null);
  const sizes = merged.filter((pr) => Number.isFinite(pr.additions)).map((pr) => pr.additions + (pr.deletions ?? 0));
  return {
    days, merged: merged.length, perDay: round(merged.length / days),
    prToMerge: { median: round(median(cycle.map((c) => c.hours))), p85: round(percentile(cycle.map((c) => c.hours), 0.85)) },
    issueToMerge: { median: round(median(lead)), counted: lead.length },
    betweenMerges: { median: round(median(gaps.map((g) => g.hours))), longest: longest && { ...longest, hours: round(longest.hours) } },
    sinceLastMerge: merged.length ? round((end - merged.at(-1).at) / HOUR) : null,
    changedLines: { median: median(sizes) },
    slowest: [...cycle].sort((a, b) => b.hours - a.hours).slice(0, 3).map((c) => ({ number: c.number, hours: round(c.hours) })),
  };
}

const h = (n) => (n === null ? "unknown" : `${n} h`);
const when = (iso) => iso.slice(0, 16).replace("T", " ");

/** The numbers as a few plain lines. */
export function report(f) {
  if (!f.merged) return `flow · last ${f.days} days · nothing merged\n`;
  const lines = [`flow · last ${f.days} days · ${f.merged} merged (${f.perDay} a day)`];
  lines.push(`pull request to merge: median ${h(f.prToMerge.median)}, 85% within ${h(f.prToMerge.p85)}`);
  if (f.issueToMerge.counted) lines.push(`issue to merge: median ${h(f.issueToMerge.median)} (${f.issueToMerge.counted} counted)`);
  const g = f.betweenMerges;
  if (g.longest) lines.push(`between merges: median ${h(g.median)}, longest ${h(g.longest.hours)} (${when(g.longest.from)} to ${when(g.longest.to)} UTC)`);
  lines.push(`since the last merge: ${h(f.sinceLastMerge)}`);
  if (f.changedLines.median !== null) lines.push(`size: median ${f.changedLines.median} changed lines (lockfiles and generated files included)`);
  if (f.slowest.length) lines.push(`slowest: ${f.slowest.map((s) => `#${s.number} (${s.hours} h)`).join(", ")}`);
  return lines.join("\n") + "\n";
}

function main(argv) {
  const args = argv.slice(2);
  const files = args.flatMap((a, i) => (a === "--github" && args[i + 1] ? [args[i + 1]] : []));
  const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const days = Number(value("--days") ?? 7);
  const now = value("--now") ? new Date(value("--now")) : new Date();
  if (!files.length || !Number.isFinite(days) || days <= 0 || Number.isNaN(now.getTime())) {
    console.error("Usage: node flow.mjs --github <merged pull requests.json> [--github <issues.json>] [--days 7] [--json]");
    return 2;
  }
  const items = [];
  for (const file of files) {
    if (!existsSync(file)) { console.error(`No file at ${file}`); return 2; }
    let list;
    try { list = JSON.parse(readFileSync(file, "utf8")); } catch (err) { console.error(`${file} is not valid JSON (${err.message})`); return 2; }
    if (!Array.isArray(list)) { console.error(`${file} must hold a JSON list, as gh ... --json prints`); return 2; }
    items.push(...list);
  }
  const f = flow(items, { days, now });
  process.stdout.write(args.includes("--json") ? JSON.stringify(f, null, 2) + "\n" : report(f));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
