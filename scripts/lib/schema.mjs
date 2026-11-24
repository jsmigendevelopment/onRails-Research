// A small JSON Schema checker for the schemas in schemas/. It knows only what those files use:
// type, const, enum, pattern, minLength, maxLength, minItems, maxItems, uniqueItems, required,
// properties, additionalProperties: false, items and local $ref. No dependencies.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);

function typeOk(wanted, v) {
  const actual = typeOf(v);
  return [wanted].flat().some((t) => t === actual || (t === "number" && actual === "integer"));
}

function resolveRef(root, ref) {
  let node = root;
  for (const part of ref.replace(/^#\//, "").split("/")) node = node[part];
  return node;
}

function checkString(v, s, where, report) {
  if (s.pattern && !new RegExp(s.pattern).test(v)) report(where, `${JSON.stringify(v)} does not match ${s.pattern}`);
  if (v.length < (s.minLength ?? 0)) report(where, s.minLength === 1 ? "is empty" : `is shorter than ${s.minLength} characters`);
  if (v.length > (s.maxLength ?? Infinity)) report(where, `is longer than ${s.maxLength} characters`);
}

function checkArray(v, s, where, report, root) {
  if (v.length < (s.minItems ?? 0)) report(where, `needs at least ${s.minItems} item${s.minItems === 1 ? "" : "s"}`);
  if (v.length > (s.maxItems ?? Infinity)) report(where, `takes at most ${s.maxItems} items`);
  if (s.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) report(where, "has a repeated item");
  if (s.items) v.forEach((x, i) => validate(x, s.items, `${where}[${i}]`, report, root));
}

function checkObject(v, s, where, report, root) {
  for (const key of s.required ?? []) if (!(key in v)) report(where, `is missing "${key}"`);
  for (const [key, value] of Object.entries(v)) {
    if (s.properties?.[key]) validate(value, s.properties[key], `${where}.${key}`, report, root);
    else if (s.additionalProperties === false) report(where, `has an unknown field "${key}"`);
  }
}

/** Checks a value against a schema. Calls report(where, message) for each problem. */
export function validate(v, s, where, report, root = s) {
  if (s.$ref) return validate(v, resolveRef(root, s.$ref), where, report, root);
  if (s.type && !typeOk(s.type, v)) return report(where, `must be ${[s.type].flat().join(" or ")}`);
  if ("const" in s && v !== s.const) report(where, `must be ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.includes(v)) report(where, `${JSON.stringify(v)} is not one of ${s.enum.map((e) => JSON.stringify(e)).join(", ")}`);
  if (typeof v === "string") checkString(v, s, where, report);
  if (Array.isArray(v)) checkArray(v, s, where, report, root);
  if (typeOf(v) === "object") checkObject(v, s, where, report, root);
}

const cache = new Map();

/** Loads schemas/<name>.schema.json from the repo root. */
export function loadSchema(root, name) {
  const path = join(root, "schemas", `${name}.schema.json`);
  if (!cache.has(path)) cache.set(path, JSON.parse(readFileSync(path, "utf8")));
  return cache.get(path);
}
