// provenance.json: who did each role. The role checks are adapted from onRails's check-research.mjs.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readTable } from "./csv.mjs";
import { dayOf, knownDate, validDate } from "./dates.mjs";
import { loadSchema, validate } from "./schema.mjs";
import { readJson } from "./store.mjs";

export const DISPOSITIONS = ["fixed", "disputed", "accepted"];
export const FACT_CHECK_COLUMNS = ["finding", "claim", "disposition", "reason"];
const MODEL_ID = /^[a-z0-9][a-z0-9._:/@-]*$/;

function checkRole(entry, n, dir, where, problems) {
  const at = `${where} roles[${n}]`;
  if (typeof entry.model === "string" && !["unknown", "human"].includes(entry.model) && !MODEL_ID.test(entry.model))
    problems.error(at, `model "${entry.model}" is not an exact model ID (lowercase, no spaces), "human" or "unknown"`);
  for (const field of ["started", "finished"])
    if (typeof entry[field] === "string" && entry[field] !== "unknown" && !validDate(dayOf(entry[field]))) problems.error(at, `${field} must be a date (YYYY-MM-DD) or "unknown"`);
  if (knownDate(entry.started) && knownDate(entry.finished) && dayOf(entry.finished) < dayOf(entry.started)) problems.error(at, "finished is before started");
  if (typeof entry.brief === "string" && entry.brief !== "unknown" && !existsSync(join(dir, entry.brief.split("#")[0]))) problems.error(at, `brief ${entry.brief} not found`);
  if ((entry.model === "unknown" || entry.effort === "unknown") && entry.model !== "human" && !entry.notes)
    problems.error(at, "model or effort is unknown: say in notes where you looked and why it isn't recorded");
  if (!entry.requested) return;
  const differs = entry.requested.model !== entry.model || entry.requested.effort !== entry.effort;
  if (differs && !entry.notes) problems.error(at, "requested and actual model or effort differ: say why in notes (a fallback, a lower effort)");
}

function checkDisposition(entry, dir, where, problems) {
  if (typeof entry.disposition !== "string" || !entry.disposition)
    return problems.error(where, "the fact-check entry needs disposition: the file where each finding is fixed, disputed or accepted");
  const file = entry.disposition.split("#")[0];
  if (file !== "fact-check.csv") return problems.error(where, 'disposition must be "fact-check.csv"');
  if (!existsSync(join(dir, file))) return problems.error(where, "fact-check.csv not found");
  const rows = readTable(join(dir, file), FACT_CHECK_COLUMNS, problems, `${where.split("/")[0]}/fact-check.csv`) ?? [];
  for (const row of rows) {
    const at = `${where.split("/")[0]}/fact-check.csv:${row.line}`;
    if (!row.finding) problems.error(at, "finding is empty");
    if (!DISPOSITIONS.includes(row.disposition)) problems.error(at, `disposition must be one of ${DISPOSITIONS.join(", ")}`);
    if (!row.reason) problems.error(at, "every finding needs a reason");
  }
}

function checkFactCheck(author, checks, dir, where, problems) {
  if (!checks.length) return problems.error(where, "no fact-check entry: a dossier is fact-checked in a fresh session before it is merged");
  for (const entry of checks) {
    checkDisposition(entry, dir, where, problems);
    if (!author) continue;
    if (entry.session !== "unknown" && entry.session === author.session) problems.error(where, "the fact-check ran in the author's session: it must be a fresh one");
  }
}

/** How far a dossier's checking went: "cross-checked" when a checker used a different model from the author (or was a person), else "fact-checked". */
export function trustOf(record) {
  const roles = record?.roles ?? [];
  const author = roles.find((r) => r.role === "author");
  const checks = roles.filter((r) => r.role === "fact-check");
  if (!author || !checks.length) return "unchecked";
  const other = checks.some((c) => c.model !== "unknown" && author.model !== "unknown" && c.model !== author.model);
  return other ? "cross-checked" : "fact-checked";
}

/** Checks one dossier's provenance.json. Returns the record, or null. */
export function checkProvenance(root, dir, id, problems) {
  const where = `${id}/provenance.json`;
  if (!existsSync(join(dir, "provenance.json"))) { problems.error(where, "missing: every dossier needs one"); return null; }
  const record = readJson(join(dir, "provenance.json"), problems, where);
  if (!record) return null;
  validate(record, loadSchema(root, "provenance"), where, problems.error);
  const roles = Array.isArray(record.roles) ? record.roles : [];
  roles.forEach((entry, n) => checkRole(entry, n, dir, where, problems));
  const author = roles.find((r) => r.role === "author");
  if (!author) problems.error(where, "no author entry");
  if (!(record.stores ?? []).includes("desk")) problems.error(where, 'stores must include "desk": every dossier lists its sources and claims');
  checkFactCheck(author, roles.filter((r) => r.role === "fact-check"), dir, where, problems);
  if (trustOf(record) === "fact-checked") problems.warn(where, "the fact-check ran on the author's model: use another model, or a person, when you can");
  return record;
}
