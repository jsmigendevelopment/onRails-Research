#!/usr/bin/env node
// The board: one page per project that shows what needs the person, what's being built,
// what's in review and what merged today. It lives OUTSIDE the repo, never committed:
//   ~/.onrails/boards/<project>.md            the board the person keeps open
//   ~/.onrails/boards/<project>.events.jsonl  append-only, so many threads can write
//   ~/.onrails/boards/<project>.github.json   the last GitHub snapshot it was given
// Until the person moves it, ~/.ai-dev-workflow/ (the old name) is used instead of ~/.onrails/.
// The profile can move it: [board] dir = "<folder>" (for example a Google Drive folder).
//
//   node board.mjs event <type> key=value ...      or   node board.mjs event <type> '<json>'
//       types: started pr-opened review needs-you decision merged finished fyi failed
//       keys (all optional): issue, pr, title, link, thread, level (blocker|decision), verdict, note
//   node board.mjs render [--github <file>]... [--print]
//       writes <project>.md from the events plus the JSON the coordinator already fetched
//       (gh issue list / gh pr list --json ...). It makes no API calls of its own.
//   node board.mjs rows [--github <file>]...       the same board as JSON rows for a Google Sheet
//   node board.mjs sheet-setup [--sheet-id N] [--tabs a,b] [--create-all]
//       prints the one-time Sheets batchUpdate requests that create and format this project's tab
//   node board.mjs path                            prints where the board lives
// Every command takes --project <name> (default: the git repo's folder name).
// Dependency-free, cross-platform, Node 22+. A write that fails exits quietly with code 0.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { basename, join } from "node:path";

const TYPES = ["started", "pr-opened", "review", "needs-you", "decision", "merged", "finished", "fyi", "failed"];
// ~/.onrails, or ~/.ai-dev-workflow (its name before the rename to onRails) while only that one exists.
const NEW_HOME = join(homedir(), ".onrails"), OLD_HOME = join(homedir(), ".ai-dev-workflow");
const HOME_DIR = !existsSync(NEW_HOME) && existsSync(OLD_HOME) ? OLD_HOME : NEW_HOME;
const DAY = 864e5;
// ONRAILS_NOW sets the clock (for tests); ADW_NOW is its name before the rename.
const NOW = process.env.ONRAILS_NOW || process.env.ADW_NOW;
const now = () => (NOW ? new Date(NOW) : new Date());

// ---------- arguments, project, profile ----------

const argv = process.argv.slice(2);
const cmd = argv[0];
function flag(name) { const i = argv.indexOf(name); return i === -1 ? undefined : argv[i + 1]; }
function flags(name) { return argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : [])); }

function git(args, cwd) {
  try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; }
}
// Claude Code sets CLAUDE_PROJECT_DIR; Codex runs commands in the session's folder.
// Either way, climb to the git root.
const START = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const ROOT = git(["rev-parse", "--show-toplevel"], START) || START;
const PROJECT = (flag("--project") || basename(ROOT)).replace(/[^\w.-]/g, "_");

// Reads one key from [section], from docs/profile.toml first, then the home profile.
function setting(section, key) {
  for (const p of [join(ROOT, "docs", "profile.toml"), join(HOME_DIR, "profile.toml")]) {
    let text;
    try { text = readFileSync(p, "utf8"); } catch { continue; }
    const body = text.split(new RegExp(`^\\[${section}\\]\\s*$`, "m"))[1]?.split(/^\[/m)[0];
    const m = body?.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
    if (m && m[1]) return m[1];
  }
  return undefined;
}
const BOARD_DIR = (setting("board", "dir") || join(HOME_DIR, "boards")).replace(/^~(?=$|[\\/])/, homedir());
const EVENTS = join(BOARD_DIR, `${PROJECT}.events.jsonl`);
const BOARD = join(BOARD_DIR, `${PROJECT}.md`);
const SNAPSHOT = join(BOARD_DIR, `${PROJECT}.github.json`);

// https://github.com/owner/repo from the origin remote, for links. Local git only.
function repoUrl() {
  const url = git(["remote", "get-url", "origin"], ROOT);
  const m = url.match(/github\.com[:/]+([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  return m ? `https://github.com/${m[1]}` : "";
}

// ---------- event ----------

function parseFields(rest) {
  if (rest[0]?.trim().startsWith("{")) return JSON.parse(rest.join(" "));
  const out = {};
  for (const pair of rest) {
    const i = pair.indexOf("=");
    if (i > 0) out[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return out;
}

function addEvent(type, rest) {
  if (!TYPES.includes(type)) throw new Error(`Unknown event type "${type}". Use one of: ${TYPES.join(", ")}`);
  const fields = parseFields(rest.filter((a, i) => a !== "--project" && rest[i - 1] !== "--project"));
  for (const k of ["issue", "pr"]) if (fields[k] !== undefined) fields[k] = Number(String(fields[k]).replace("#", "")) || undefined;
  const entry = { ts: now().toISOString(), type, host: hostname(), thread: process.env.ONRAILS_THREAD || process.env.ADW_THREAD || undefined, ...fields };
  mkdirSync(BOARD_DIR, { recursive: true });
  appendFileSync(EVENTS, JSON.stringify(entry) + "\n"); // one small append per event: safe across threads
  console.log(JSON.stringify({ ok: true, file: EVENTS }));
}

function readEvents() {
  if (!existsSync(EVENTS)) return [];
  return readFileSync(EVENTS, "utf8").split("\n").filter(Boolean).flatMap((l) => {
    try { const e = JSON.parse(l); return e.ts && e.type ? [e] : []; } catch { return []; }
  }).sort((a, b) => a.ts.localeCompare(b.ts));
}

// ---------- GitHub snapshot (already fetched by the coordinator) ----------

// Each --github file is one JSON array (gh issue list or gh pr list output) or an object
// { issues, prs, merged }. Arrays are sorted by shape: rows with headRefName are pull requests.
function readSnapshot(files) {
  const snap = { issues: null, prs: null, merged: [], fetchedAt: null };
  for (const f of files) {
    let data;
    try { data = JSON.parse(readFileSync(f, "utf8")); } catch (e) { console.error(`board: skipped ${f} (${e.message})`); continue; }
    const parts = Array.isArray(data) ? [data] : [data.issues, data.prs, data.pullRequests, data.merged].filter(Array.isArray);
    for (const list of parts) for (const row of list) {
      if (row.headRefName !== undefined || row.mergedAt) {
        if (row.mergedAt) snap.merged.push(row);
        else (snap.prs ??= []).push(row);
      } else (snap.issues ??= []).push(row);
    }
    if (!Array.isArray(data) && data.fetchedAt) snap.fetchedAt = data.fetchedAt;
  }
  if (files.length) {
    snap.fetchedAt ??= now().toISOString();
    try { mkdirSync(BOARD_DIR, { recursive: true }); writeFileSync(SNAPSHOT, JSON.stringify(snap) + "\n"); } catch {}
  }
  return snap;
}

// ---------- building the board ----------

const labelsOf = (row) => (row.labels || []).map((l) => (typeof l === "string" ? l : l.name));
const issueFromBranch = (ref) => Number(String(ref || "").match(/^[\w-]+\/(\d+)[-_]/)?.[1]) || undefined;

function build(events, snap) {
  const t = now().getTime();
  const items = new Map();
  const fyi = [];
  const prToIssue = new Map();
  const base = repoUrl();
  const keyOf = (e) => {
    if (e.issue && e.pr) prToIssue.set(e.pr, e.issue);
    const issue = e.issue || (e.pr && prToIssue.get(e.pr));
    return issue ? `i${issue}` : e.pr ? `p${e.pr}` : e.title ? `t${e.title}` : null;
  };
  const item = (k, e) => {
    if (!items.has(k)) items.set(k, { key: k });
    const it = items.get(k);
    if (e.issue) it.issue = e.issue;
    if (e.pr) it.pr = e.pr;
    if (e.title && !it.title) it.title = e.title;
    if (e.thread && e.type !== "review" && e.type !== "merged") it.thread = e.thread; // who builds it, not who checked it
    it.updated = e.ts;
    return it;
  };

  for (const e of events) {
    const k = keyOf(e);
    if (e.type === "fyi" || !k) { // a heads-up, or an event about no issue (e.g. "the queue is empty")
      fyi.push({ ts: e.ts, title: e.title || e.type, note: e.note, link: e.link, thread: e.thread });
      continue;
    }
    const it = item(k, e);
    if (e.link && e.type !== "needs-you") it.link = e.link;
    switch (e.type) {
      case "started": if (it.stage !== "build") it.since = e.ts; it.stage = "build"; break;
      case "pr-opened": it.stage = "review"; it.reviewSince = e.ts; if (e.link) it.prLink = e.link; break;
      case "review": if (it.stage !== "merged") it.stage = "review"; it.reviewSince ??= e.ts; it.verdict = e.verdict || e.note; break;
      case "needs-you": it.ask = e.level === "blocker" ? "blocker" : "decision"; it.askAt = e.ts; it.askTitle = e.title; it.askNote = e.note; it.askLink = e.link; break;
      case "decision": it.ask = null; fyi.push({ ts: e.ts, title: `Decided: ${e.title || it.askTitle || it.title || k}`, note: e.note, link: e.link }); break;
      case "merged": it.stage = "merged"; it.doneAt = e.ts; it.ask = null; break;
      case "finished": if (it.stage === "build" || !it.stage) { it.stage = "done"; it.doneAt = e.ts; } it.note = e.note || it.note; break;
      case "failed": it.stage = "failed"; it.doneAt = e.ts; it.note = e.note; break;
    }
  }

  // GitHub fills in what cloud threads (which can't reach this folder) said with labels.
  const openIssues = new Set(), openPrs = new Set();
  for (const row of snap.issues || []) {
    openIssues.add(row.number);
    const labels = labelsOf(row);
    const k = `i${row.number}`;
    const it = items.get(k) || { key: k, issue: row.number, title: row.title, gh: true };
    it.title ??= row.title;
    it.ghLink = row.url;
    if (labels.includes("needs-human") && !it.ask) {
      it.ask = labels.includes("blocker") ? "blocker" : "decision";
      it.askAt = row.updatedAt; it.askTitle = row.title; it.askNote = "labelled needs-human on GitHub";
    } else if (!labels.includes("needs-human") && it.ask && row.updatedAt && it.askAt && row.updatedAt > it.askAt) {
      it.ask = null; // the label came off on GitHub after the ask: answered
    }
    if (labels.includes("status:in-progress") && !it.stage) {
      it.stage = "build"; it.since = row.updatedAt; it.thread ??= "claimed on GitHub";
    }
    if (it.ask || it.stage) items.set(k, it);
  }
  for (const row of snap.prs || []) {
    openPrs.add(row.number);
    const issue = issueFromBranch(row.headRefName) || prToIssue.get(row.number);
    const k = issue ? `i${issue}` : `p${row.number}`;
    const it = items.get(k) || { key: k, issue, title: row.title, gh: true };
    it.pr = row.number; it.prLink = row.url; it.title ??= row.title;
    if (it.stage !== "merged") { it.stage = "review"; it.reviewSince ??= row.updatedAt; }
    if (row.isDraft) it.note ??= "draft";
    if (labelsOf(row).includes("needs-human") && !it.ask) { it.ask = "decision"; it.askAt = row.updatedAt; it.askTitle = row.title; it.askNote = "labelled needs-human on GitHub"; }
    items.set(k, it);
  }
  for (const row of snap.merged) {
    const issue = issueFromBranch(row.headRefName);
    const k = issue ? `i${issue}` : `p${row.number}`;
    const it = items.get(k) || { key: k, issue, title: row.title };
    it.pr = row.number; it.prLink = row.url; it.stage = "merged"; it.doneAt = row.mergedAt; it.ask = null;
    items.set(k, it);
  }
  // With a full open-issue list, local work whose issue and PR are both gone was closed on GitHub.
  if (snap.issues) for (const it of items.values()) {
    if ((it.stage === "build" || it.stage === "review") && it.issue && !openIssues.has(it.issue) && !(it.pr && openPrs.has(it.pr))) it.stage = "closed";
  }

  const link = (it) => it.prLink || it.link || it.ghLink || (base && it.pr ? `${base}/pull/${it.pr}` : base && it.issue ? `${base}/issues/${it.issue}` : "");
  const issueLink = (it) => it.ghLink || (base && it.issue ? `${base}/issues/${it.issue}` : "");
  const fresh = (ts) => ts && t - Date.parse(ts) < DAY; // finished items roll off after a day
  const sections = { now: [], waiting: [], build: [], review: [], merged: [], fyi: [] };
  for (const it of items.values()) {
    const row = { ...it, href: link(it), issueHref: issueLink(it) };
    if (it.ask === "blocker") sections.now.push({ ...row, at: it.askAt });
    else if (it.ask === "decision") sections.waiting.push({ ...row, at: it.askAt });
    else if (it.stage === "build") sections.build.push({ ...row, at: it.since });
    else if (it.stage === "review") sections.review.push({ ...row, at: it.reviewSince || it.updated });
    else if (it.stage === "merged" && fresh(it.doneAt)) sections.merged.push({ ...row, at: it.doneAt });
    else if ((it.stage === "failed" || it.stage === "done") && fresh(it.doneAt)) sections.fyi.push({ ts: it.doneAt, title: `${it.stage === "failed" ? "❌ Failed" : "Finished"}: ${it.title || it.key}`, note: it.note, link: link(it), thread: it.thread });
  }
  sections.fyi.push(...fyi.filter((f) => fresh(f.ts)));
  for (const list of Object.values(sections)) list.sort((a, b) => String(b.at || b.ts).localeCompare(String(a.at || a.ts)));
  return sections;
}

// ---------- presence and time ----------

function presence() {
  try { return JSON.parse(readFileSync(join(HOME_DIR, "presence.json"), "utf8")); } catch { return { status: "here" }; }
}
const pad = (n) => String(n).padStart(2, "0");
function when(ts) {
  if (!ts) return "";
  const d = new Date(ts), n = now();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === n.toDateString() ? hm : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`;
}
function ago(ts) {
  const m = Math.max(0, Math.round((now() - Date.parse(ts)) / 60e3));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
function presenceLine() {
  const p = presence();
  return p.status === "away"
    ? `🌙 away since ${when(p.since)}${p.note ? ` (${p.note})` : ""}`
    : `🟢 here`;
}

// ---------- render (Markdown) ----------

const SECTIONS = [
  ["now", "🛑 Needs you now", "blocker"],
  ["waiting", "⏳ Waiting on your decision", "decision"],
  ["build", "🔨 Being built", "building"],
  ["review", "🔍 In review", "in review"],
  ["merged", "✅ Merged today", "merged"],
  ["fyi", "ℹ️ FYI", "fyi"],
];
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const md = (text, href) => (href ? `[${text}](${href})` : text);

function ref(it) {
  const parts = [];
  if (it.issue) parts.push(md(`#${it.issue}`, it.issueHref));
  if (it.pr) parts.push(md(`PR #${it.pr}`, it.prLink || it.href));
  return parts.join(" · ");
}

function line(key, it) {
  if (key === "fyi") return `- ${when(it.ts)} · ${md(clean(it.title), it.link)}${it.note ? ` · ${clean(it.note)}` : ""}${it.thread ? ` · \`${clean(it.thread)}\`` : ""}`;
  const bits = [ref(it), clean(key === "now" || key === "waiting" ? it.askTitle || it.title : it.title)].filter(Boolean);
  if ((key === "now" || key === "waiting") && it.askNote) bits.push(clean(it.askNote));
  if (key === "review" && it.verdict) bits.push(clean(it.verdict));
  if (it.thread) bits.push(`\`${clean(it.thread)}\``);
  if (key === "merged") bits.push(when(it.at));
  else if (it.at) bits.push(`since ${when(it.at)} (${ago(it.at)})`);
  if (key !== "now" && key !== "waiting" && key !== "review" && it.note) bits.push(clean(it.note));
  return `- ${bits.join(" · ")}`;
}

function render(sections, snap, count) {
  const out = [`# 📋 ${PROJECT} · board`, "", `**Presence:** ${presenceLine()}`, ""];
  out.push(`<sub>Rendered ${when(now().toISOString())} from ${count} events${snap.fetchedAt ? ` and GitHub as of ${when(snap.fetchedAt)}` : ""}. Finished items roll off after a day.</sub>`, "");
  for (const [key, heading] of SECTIONS) {
    const list = sections[key];
    out.push(`## ${heading}`, "");
    const latest = list.map((x) => x.at || x.ts).filter(Boolean).sort().pop();
    out.push(`<sub>${list.length ? `${list.length} · updated ${when(latest)}` : "nothing here"}</sub>`, "");
    if (list.length) out.push(...list.map((it) => line(key, it)), "");
  }
  return out.join("\n").replace(/\n+$/, "\n");
}

function writeAtomic(file, text) {
  mkdirSync(BOARD_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file); // readers never see half a board
}

// ---------- rows and sheet setup (Google Sheets) ----------

const HEADER = ["Section", "Item", "Link", "Who", "Since", "Status", "Note", "Project"];
const tabName = () => PROJECT.slice(0, 90);
const quoteTab = (name) => `'${name.replace(/'/g, "''")}'`;
const formulaText = (s) => clean(s).replace(/"/g, '""');

function rows(sections, snap) {
  const out = [];
  for (const [key, heading, status] of SECTIONS) for (const it of sections[key]) {
    const fy = key === "fyi";
    const href = fy ? it.link : it.href;
    const label = fy ? "link" : it.pr ? `PR #${it.pr}` : it.issue ? `#${it.issue}` : "link";
    out.push({
      section: heading,
      item: clean(fy ? it.title : (key === "now" || key === "waiting") ? it.askTitle || it.title : it.title),
      link: href || "",
      linkLabel: href ? label : "",
      who: clean(it.thread),
      since: when(fy ? it.ts : it.at),
      status: key === "review" && it.verdict ? `${status}: ${clean(it.verdict)}` : status,
      note: clean((key === "now" || key === "waiting") ? it.askNote : it.note),
      project: PROJECT,
    });
  }
  const top = `Updated ${when(now().toISOString())} · presence ${presenceLine()}${snap.fetchedAt ? ` · GitHub as of ${when(snap.fetchedAt)}` : ""}`;
  const values = [
    [top, "", "", "", "", "", "", ""],
    HEADER,
    ...out.map((r) => [r.section, r.item, r.link ? `=HYPERLINK("${formulaText(r.link)}","${formulaText(r.linkLabel)}")` : "", r.who, r.since, r.status, r.note, r.project]),
  ];
  const tab = quoteTab(tabName());
  return {
    project: PROJECT,
    tab: tabName(),
    updated: now().toISOString(),
    presence: presence().status,
    clearRange: `${tab}!A1:H1000`,
    range: `${tab}!A1:H${values.length}`,
    valueInputOption: "USER_ENTERED",
    rows: out,
    values,
  };
}

// A stable sheet id from the project name, so setup can create and format in one batchUpdate.
const sheetIdFor = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 2_000_000_000 + 1000;
const rgb = (hex) => ({ red: parseInt(hex.slice(1, 3), 16) / 255, green: parseInt(hex.slice(3, 5), 16) / 255, blue: parseInt(hex.slice(5, 7), 16) / 255 });
const COLOURS = [
  ["Needs you now", "#F8D0D0"], ["Waiting on your decision", "#FCE8B2"], ["Being built", "#D6E6FB"],
  ["In review", "#E5DAF7"], ["Merged today", "#D3EFD9"], ["FYI", "#E8E8E8"],
];

function sheetSetup() {
  const sheetId = Number(flag("--sheet-id")) || sheetIdFor(PROJECT);
  const requests = [
    { addSheet: { properties: { sheetId, title: tabName(), gridProperties: { frozenRowCount: 2, columnCount: 8 } } } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { italic: true, foregroundColor: rgb("#555555") } } }, fields: "userEnteredFormat.textFormat" } },
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 }, mergeType: "MERGE_ALL" } },
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: rgb("#F1F3F4") } }, fields: "userEnteredFormat(textFormat,backgroundColor)" } },
    // Light banding on the detail columns; the section and status columns carry the colour.
    { addBanding: { bandedRange: { range: { sheetId, startRowIndex: 2, startColumnIndex: 1, endColumnIndex: 5 }, rowProperties: { firstBandColor: rgb("#FFFFFF"), secondBandColor: rgb("#F8F9FA") } } } },
    { addBanding: { bandedRange: { range: { sheetId, startRowIndex: 2, startColumnIndex: 6, endColumnIndex: 8 }, rowProperties: { firstBandColor: rgb("#FFFFFF"), secondBandColor: rgb("#F8F9FA") } } } },
    ...COLOURS.map(([text, hex], index) => ({
      addConditionalFormatRule: {
        index,
        rule: {
          ranges: [{ sheetId, startRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 }, { sheetId, startRowIndex: 2, startColumnIndex: 5, endColumnIndex: 6 }],
          booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: `=REGEXMATCH($A3, "${text}")` }] }, format: { backgroundColor: rgb(hex) } },
        },
      },
    })),
    ...[[0, 190], [1, 320], [2, 90], [3, 150], [4, 120], [5, 150], [6, 280], [7, 120]].map(([i, px]) => ({
      updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: "pixelSize" },
    })),
  ];
  // "All projects" stacks every project tab with a formula, so no thread ever overwrites another's rows.
  const tabs = (flag("--tabs") || tabName()).split(",").map((s) => s.trim()).filter(Boolean);
  if (!tabs.includes(tabName())) tabs.push(tabName());
  const allId = 999;
  if (argv.includes("--create-all")) {
    requests.push({ addSheet: { properties: { sheetId: allId, title: "All projects", index: 0, gridProperties: { frozenRowCount: 2, columnCount: 8 } } } });
    requests.push({ updateCells: { range: { sheetId: allId, startRowIndex: 1, endRowIndex: 2 }, rows: [{ values: HEADER.map((h) => ({ userEnteredValue: { stringValue: h }, userEnteredFormat: { textFormat: { bold: true }, backgroundColor: rgb("#F1F3F4") } })) }], fields: "userEnteredValue,userEnteredFormat" } });
    for (const [index, [text, hex]] of COLOURS.entries()) requests.push({ addConditionalFormatRule: { index, rule: { ranges: [{ sheetId: allId, startRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 }, { sheetId: allId, startRowIndex: 2, startColumnIndex: 5, endColumnIndex: 6 }], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: `=REGEXMATCH($A3, "${text}")` }] }, format: { backgroundColor: rgb(hex) } } } } });
  }
  const stack = tabs.map((t) => `${quoteTab(t)}!A3:H`).join(";");
  const formula = `=IFERROR(QUERY({${stack}}, "select * where Col1 is not null", 0), "Nothing on any board.")`;
  requests.push({ updateCells: { range: { sheetId: allId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { formulaValue: formula } }] }], fields: "userEnteredValue" } });
  requests.push({ updateCells: { range: { sheetId: allId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: `All projects · ${tabs.length} tab(s) · each tab says when it was updated` } }] }], fields: "userEnteredValue" } });
  console.log(JSON.stringify({ sheetId, tab: tabName(), allProjectsSheetId: allId, tabs, requests }, null, 2));
}

// ---------- main ----------

try {
  if (cmd === "event") addEvent(argv[1], argv.slice(2));
  else if (cmd === "render") {
    const files = flags("--github");
    let snap = readSnapshot(files);
    if (!files.length) { try { snap = JSON.parse(readFileSync(SNAPSHOT, "utf8")); } catch {} } // the last snapshot it was given
    const events = readEvents();
    const text = render(build(events, snap), snap, events.length);
    writeAtomic(BOARD, text);
    if (argv.includes("--print")) process.stdout.write(text);
    else console.log(BOARD);
  } else if (cmd === "rows") {
    const files = flags("--github");
    let snap = readSnapshot(files);
    if (!files.length) { try { snap = JSON.parse(readFileSync(SNAPSHOT, "utf8")); } catch {} } // the last snapshot render saw
    console.log(JSON.stringify(rows(build(readEvents(), snap), snap), null, 2));
  } else if (cmd === "sheet-setup") sheetSetup();
  else if (cmd === "path") console.log(JSON.stringify({ board: BOARD, events: EVENTS, snapshot: SNAPSHOT, sheet: setting("board", "sheet") || null }));
  else {
    console.log("Usage: board.mjs event <type> key=value ... | render [--github <file>]... [--print] | rows [--github <file>]... | sheet-setup [--sheet-id N] [--tabs a,b] [--create-all] | path");
    console.log(`Types: ${TYPES.join(", ")}`);
  }
} catch (e) {
  console.error(`board: ${e.message}`);
  process.exitCode = cmd === "event" && /Unknown event type/.test(e.message) ? 2 : 0;
}
