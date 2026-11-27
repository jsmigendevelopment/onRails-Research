#!/usr/bin/env node
// Checks that the current pass in docs/pyramid.md is cut into thin steps (the pyramid skill).
// It reads the steps table and fails a plan that is empty, is cut by layer, has a step nobody
// can try, has steps that are too big, or has too few steps for its slices. No dependencies.
// Usage:  node check-plan.mjs [docs/pyramid.md]      errors fail (exit 1)
//         node check-plan.mjs <file> --json          the numbers and the problems as JSON
//         node check-plan.mjs <file> --per-slice 3   ask for more steps per slice (default 2)
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const COLUMNS = ["#", "step", "slice", "try it", "size", "after"];
export const THIN = 4; // a step this size or under needs no reason
export const HARD_CAP = 7; // above this the issues skill splits it anyway
export const BIG_SHARE = 1 / 3; // at most this share of steps may be above THIN
export const PER_SLICE = 2; // fewer steps than this per slice means the plan lists slices, not steps

// Step names. Precision beats recall: an error must never block a real user step, so only a clear
// layer name is an error. A fuzzy one is a warning, which the agent reads and fixes if it agrees.
// A word before a suffix that is not a noun: "Join a server", "Add services", "Create a table" pass.
const NOT_NOUN = String.raw`(?!(?:a|an|the|my|your|our|their|his|her|its|this|that|these|those|new|of|to|for|with|in|on|from|add|create|build|make|edit|delete|remove|pick|choose|book|view|see|open|show|list|join|plan|export|import|share|rename|save|paste|find|search|manage|browse|start|run|use)\b)`;
const ends = (suffix) => new RegExp(String.raw`\b${NOT_NOUN}[a-z][\w-]*?[- ]?(?:${suffix})$`, "i");
const NAME_ERRORS = [
  // The whole name is layer words, with at least one clear one: "Set up the database", "Backend setup".
  (n) => LAYER_ONLY.test(n) && STRONG.test(n),
  // A clear layer word anywhere: "APIs for notes", "Front-End list", "UI-only list", "Booking servicelayer".
  (n) => /\b(?:apis?(?!\s+(?:keys?|tokens?)\b)|graphql|back[- ]?ends?|front[- ]?ends?|orm|crud|ui[- ]only|server[- ]side|client[- ]side|data[- ]?models?)\b|(?:service|data|model|api|ui|domain|business|persistence|presentation|repository|db)[- ]?layers?\b/i.test(n),
  // A noun, then a layer: "Bookings table", "Booking models", "the booking schema", "Booking UI", "Booking server".
  (n) => ends(String.raw`tables?|models|schemas?|apis?|back[- ]?ends?|front[- ]?ends?|servers?|ui|db|databases?|endpoints?|migrations?|sql`).test(n),
];
const NAME_WARNINGS = [
  // Only layer words, but none of them clear: "Create the tables", "Wire up the services".
  (n) => LAYER_ONLY.test(n) && !/^add\b/i.test(n),
  // A noun, then a word that is often a layer: "Booking store", "Booking hooks", "List repository".
  (n) => ends(String.raw`repos?|repositor(?:y|ies)|persistence|storage|middleware|controllers?|handlers?|webhooks?|store|quer(?:y|ies)|dtos?|types|hooks|screens|services|routes|components|layers?`).test(n),
];
const LAYER_ONLY = /^(?:(?:set ?up|create|build|implement|add|design|write|define|wire(?: up)?|scaffold)\s+)?(?:(?:the|all|our|every)\s+)*(?:(?:database|db|schema|migrations?|data|models?|tables|entities|api|rest|graphql|endpoints?|routes?|backend|back end|server|services?|repositor(?:y|ies)|frontend|front end|ui|user interface|components?|layers?|setup|scaffolding|and|&|,)\s*)+$/i;
const STRONG = /\b(?:database|db|schema|migrations?|api|rest|graphql|endpoints?|backend|back end|frontend|front end|ui|user interface|repositor(?:y|ies)|entities|layers?|scaffolding)\b/i;
// A step name with "and" in it is often two steps: "Add and delete an item".
const TWO_THINGS = /\s(?:and|&)\s/i;
// Try lines. An error is a developer's check: a status code, a test run, a query, an HTTP call, a
// dev tool. Never the bare words "log" or "console": "Open the console page" is a real step.
const TRY_ERRORS = /\b(?:nothing (?:to see|visible|yet)|not visible|no visible|tests? pass(?:es)?|unit tests?|ci (?:is |runs? )?green|migrations?\b|curl|postman|httpie|wget|psql|sql|npm|pnpm|yarn|npx|dev ?tools|network (?:panel|tab)|run (?:a |an |the )?(?:sql )?quer(?:y|ies)|in the database|schema exists|table exists|compiles|builds? clean|(?:returns?|see|sees|get|gets|answers?|responds? with)\s+(?:a |an )?[1-5]\d\d\b|(?:call|hit|ping|query)\s+(?:the |an? |every |each |our )?(?:[\w/.-]+\s+)?(?:endpoints?|apis?|backend)\b)|\b(?:GET|POST|PUT|PATCH|DELETE)\s+(?:(?:a |the )?request\s+)?(?:to\s+)?\/|\/api\//i;
const TRY_WARNINGS = /\b(?:sentry|drizzle studio|wrangler|d1|json|(?:check|read|tail|watch|grep) the (?:\w+ )?logs\b(?!\s+page))/i;
// The Size cell: a number, then for a big step the reason it can't be cut: "5 · the first table and its screen".
const SIZE = /^\s*(\d+)\s*(?:[·•\-–—:,(]+\s*(.*?)\)?\s*)?$/;

const cells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isRow = (line) => line.trim().startsWith("|");
const key = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Every Markdown table in the text, as { header: [lowercase names], rows: [{ line, cells }] }. */
export function tables(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!isRow(lines[i]) || !/^\|?\s*:?-{3,}/.test(lines[i + 1].trim())) continue;
    const table = { header: cells(lines[i]).map((c) => c.toLowerCase().replaceAll("*", "")), rows: [] };
    for (i += 2; i < lines.length && isRow(lines[i]); i++) table.rows.push({ line: i + 1, cells: cells(lines[i]) });
    out.push(table);
  }
  return out;
}

const blank = (row) => row.cells.every((c) => !c || /^<!--.*-->$/.test(c));
const named = (table, row) => Object.fromEntries(table.header.map((name, n) => [name, row.cells[n] ?? ""]));

/** The steps of the current pass, or null when the file has no steps table. */
export function readSteps(text) {
  const table = tables(text).find((t) => COLUMNS.every((c) => t.header.includes(c)));
  if (!table) return null;
  return table.rows.filter((r) => !blank(r)).map((r) => {
    const c = named(table, r);
    const size = c.size.match(SIZE);
    return {
      line: r.line, id: c["#"], name: c.step, slice: c.slice, tryIt: c["try it"],
      size: size ? Number(size[1]) : null, reason: size?.[2] ?? "",
      after: c.after.split(/[,\s]+/).map((s) => s.replace(/^#/, "")).filter(Boolean),
    };
  });
}

/** The slices the plan lists (the table with Slice and Role columns), by name. */
export function readSlices(text) {
  const table = tables(text).find((t) => t.header.includes("slice") && t.header.includes("role"));
  if (!table) return [];
  return table.rows.filter((r) => !blank(r)).map((r) => named(table, r).slice).filter(Boolean);
}

/** The pass marked building in the outline, as its number, or null. */
export function buildingPass(text) {
  const table = tables(text).find((t) => t.header.includes("pass") && t.header.includes("status"));
  const row = table?.rows.find((r) => /\bbuilding\b/i.test(named(table, r).status));
  const n = row && named(table, row).pass.match(/\d+/);
  return n ? Number(n[0]) : null;
}

/**
 * The slices a pass covers, from its Slices cell in the outline: "all" or "every" means every
 * slice, "core" the core slices, "supports" the support slices, and any slice named by name.
 * "key supports" names none on its own: the cell must name them.
 */
const mentions = (text, name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);

export function passSlices(text, pass) {
  const outline = tables(text).find((t) => t.header.includes("pass") && t.header.includes("status"));
  const sliceTable = tables(text).find((t) => t.header.includes("slice") && t.header.includes("role"));
  const row = outline?.rows.find((r) => Number(named(outline, r).pass.match(/\d+/)?.[0]) === pass);
  if (!row || !sliceTable) return [];
  const cell = named(outline, row).slices ?? "";
  const all = pass === 1 || /\b(?:all|every)\b/i.test(cell);
  const core = /\bcore\b/i.test(cell);
  const supports = /\bsupports?\b/i.test(cell) && !/\bkey supports?\b/i.test(cell);
  return sliceTable.rows.filter((r) => !blank(r)).map((r) => named(sliceTable, r))
    .filter((c) => c.slice && (all || (core && /\bcore\b/i.test(c.role)) || (supports && /\bsupport\b/i.test(c.role)) || mentions(cell, c.slice)))
    .map((c) => c.slice);
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// The longest chain of steps that must be built one after another.
function longestChain(steps) {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const depth = new Map();
  const walk = (s, seen = new Set()) => {
    if (depth.has(s.id)) return depth.get(s.id);
    if (seen.has(s.id)) return 0; // a loop is reported as its own problem
    seen.add(s.id);
    const d = 1 + Math.max(0, ...s.after.map((id) => (byId.has(id) ? walk(byId.get(id), seen) : 0)));
    depth.set(s.id, d);
    return d;
  };
  return Math.max(0, ...steps.map((s) => walk(s)));
}

function checkStep(step, seen, position, problem, warn) {
  const where = `step ${step.id || "?"} (line ${step.line})`;
  if (!step.id) problem(where, "has no number in the # column");
  else if (seen.has(step.id)) problem(where, `the number ${step.id} is used twice`);
  if (!step.name) problem(where, "has no name");
  else if (NAME_ERRORS.some((t) => t(step.name))) problem(where, `"${step.name}" is a layer, not a step. Cut through every layer instead: one thing a person can do, from the screen to the data`);
  else if (NAME_WARNINGS.some((t) => t(step.name))) warn(where, `"${step.name}" may be a layer. If it is, cut through every layer instead`);
  if (!step.slice) problem(where, "names no slice");
  const words = step.tryIt.split(/\s+/).filter(Boolean).length;
  if (TRY_WARNINGS.test(step.tryIt) && !TRY_ERRORS.test(step.tryIt)) warn(where, `the try line may be a developer's check ("${step.tryIt}"). If it is, say what the person does on the test site`);
  if (TRY_ERRORS.test(step.tryIt)) problem(where, `the try line is a developer's check ("${step.tryIt}"). Say what the person does on the test site and what they see`);
  else if (words < 4) problem(where, "has no try line. Say what the person does on the test site and what they see. No try line, no step");
  if (step.size === null || step.size < 1 || step.size > 10) problem(where, "Size must be a number from 1 to 10");
  else if (step.size > HARD_CAP) problem(where, `size ${step.size} is above ${HARD_CAP}: split it`);
  else if (step.size > THIN && !step.reason) problem(where, `size ${step.size} is above ${THIN} with no reason. Cut it thinner, or write why it can't be cut: "${step.size} · <reason>"`);
  for (const id of step.after) {
    if (id === step.id) problem(where, "comes after itself");
    else if (!position.has(id)) problem(where, `comes after step ${id}, which isn't in the table`);
    else if (position.get(id) > position.get(step.id)) problem(where, `comes after step ${id}, which is listed later. List steps in build order`);
  }
}

/** Checks a pyramid plan's steps. Returns { errors, warnings, stats }; each problem is "where: message". */
export function checkPlan(text, { perSlice = PER_SLICE } = {}) {
  const errors = [], warnings = [];
  const problem = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const steps = readSteps(text);
  if (!steps) {
    problem("plan", `no steps table. The current pass needs one with the columns: ${COLUMNS.join(" | ")}`);
    return { errors, warnings, stats: null };
  }
  const slices = readSlices(text);
  if (!slices.length) problem("plan", "no slices. List the slices in the Slices table, with a Slice and a Role column");
  if (!steps.length) problem("plan", "the current pass has no steps. Cut it into the smallest things a person can try");
  const position = new Map(steps.map((s, n) => [s.id, n]));
  const seen = new Set();
  for (const step of steps) { checkStep(step, seen, position, problem, warn); seen.add(step.id); }

  // Slice 0 is the skeleton: it is set-up, so it doesn't count as a slice to cut, or toward the big share.
  const sliceOf = (s) => key(s.slice);
  const featureSteps = steps.filter((s) => !/^slice0$|^skeleton$/.test(sliceOf(s)));
  for (const step of featureSteps) {
    if (step.name && TWO_THINGS.test(step.name)) warnings.push(`step ${step.id || "?"} (line ${step.line}): "${step.name}" has an "and" in its name. That is often two steps: cut it in two`);
  }
  const stepSlices = new Set(featureSteps.map(sliceOf).filter(Boolean));
  const sizes = steps.map((s) => s.size).filter((n) => n !== null);
  const big = featureSteps.filter((s) => s.size !== null && s.size > THIN);
  if (stepSlices.size && featureSteps.length < perSlice * stepSlices.size) {
    problem("plan", `${featureSteps.length} steps for ${stepSlices.size} slices. That lists slices, not steps: aim for ${perSlice} or more per slice (${perSlice * stepSlices.size} here). Cut each slice into the smallest things a person can try`);
  }
  if (featureSteps.length >= 3 && big.length > Math.floor(featureSteps.length * BIG_SHARE)) {
    problem("plan", `${big.length} of ${featureSteps.length} steps after slice 0 are above size ${THIN}. At most one in three may be: cut the big ones thinner`);
  }
  const pass = buildingPass(text);
  for (const name of passSlices(text, pass)) {
    if (!stepSlices.has(key(name))) problem("plan", `pass ${pass} has no step for the slice "${name}". Every slice the pass covers needs at least one step`);
  }
  const stats = {
    steps: steps.length, slices: stepSlices.size,
    perSlice: stepSlices.size ? Math.round((featureSteps.length / stepSlices.size) * 10) / 10 : null,
    medianSize: median(sizes), maxSize: sizes.length ? Math.max(...sizes) : null, aboveThin: big.length,
    longestChain: longestChain(steps), canStartNow: steps.filter((s) => !s.after.length).length,
  };
  if (stats.longestChain > 1 && stats.longestChain === steps.length && steps.length > 3) {
    warnings.push("plan: every step waits for the one before it, so only one builder can work at a time. Check which steps really depend on each other");
  }
  return { errors, warnings, stats };
}

function main(argv) {
  const args = argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const perSlice = Number(opt("--per-slice") ?? PER_SLICE);
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--")) ?? "docs/pyramid.md";
  if (!Number.isFinite(perSlice) || perSlice < 1) { console.error("--per-slice needs a number, 1 or more"); return 2; }
  if (!existsSync(file)) { console.error(`No plan at ${file}. Usage: node check-plan.mjs [docs/pyramid.md] [--per-slice N] [--json]`); return 2; }
  const r = checkPlan(readFileSync(file, "utf8"), { perSlice });
  if (json) { console.log(JSON.stringify(r, null, 2)); return r.errors.length ? 1 : 0; }
  for (const e of r.errors) console.error(`error: ${e}`);
  for (const w of r.warnings) console.log(`warn:  ${w}`);
  const s = r.stats;
  if (s) console.log(`plan: ${s.steps} steps, ${s.slices} slices (${s.perSlice ?? "-"} per slice), median size ${s.medianSize ?? "-"}, biggest ${s.maxSize ?? "-"}, ${s.canStartNow} can start now, longest chain ${s.longestChain}`);
  console.log(`plan: ${r.errors.length} errors, ${r.warnings.length} warnings`);
  return r.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
