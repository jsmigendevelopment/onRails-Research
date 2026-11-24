// A small RFC 4180 reader and writer. Adapted from onRails's check-research.mjs.
import { isFile, NOT_REGULAR, readText } from "./store.mjs";

/** Rows of fields. Handles quoted fields, doubled quotes, and commas or newlines inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

/** One CSV field, quoted only when it has to be. */
export const csvField = (value) => (/[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

export const csvLine = (values) => values.map((v) => csvField(String(v ?? ""))).join(",");

/** Reads a CSV with an exact header. Returns the rows as objects with a line number, or null when the header is wrong. */
export function readTable(path, columns, problems, label) {
  if (!isFile(path)) { problems.error(label, NOT_REGULAR); return null; }
  const rows = parseCsv(readText(path));
  const header = rows[0] ?? [];
  if (header.join(",") !== columns.join(",")) {
    problems.error(label, `columns must be exactly: ${columns.join(",")}`);
    return null;
  }
  return rows.slice(1).map((r, n) => ({ line: n + 2, ...Object.fromEntries(columns.map((c, i) => [c, (r[i] ?? "").trim()])) }));
}
