// The fixed tag lists in tags/<facet>.json.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadSchema, validate } from "./schema.mjs";
import { FACETS, readJson } from "./store.mjs";

/** Loads and checks the four tag lists. Returns { facet: Map(id -> value) }. */
export function loadTags(root, problems) {
  const lists = {};
  for (const facet of FACETS) {
    const label = `tags/${facet}.json`;
    lists[facet] = new Map();
    if (!existsSync(join(root, label))) { problems.error(label, "missing: every facet has a fixed list"); continue; }
    const list = readJson(join(root, label), problems, label);
    if (!list) continue;
    validate(list, loadSchema(root, "tags"), label, problems.error);
    if (list.facet !== facet) problems.error(label, `facet must be "${facet}"`);
    for (const value of list.values ?? []) {
      if (lists[facet].has(value.id)) problems.error(label, `"${value.id}" is listed twice`);
      lists[facet].set(value.id, value);
    }
    checkRetired(lists[facet], label, problems);
  }
  return lists;
}

function checkRetired(values, label, problems) {
  for (const value of values.values()) {
    if (value.use_instead && !value.retired) problems.error(label, `"${value.id}" has use_instead but no retired date`);
    if (!value.use_instead) continue;
    const target = values.get(value.use_instead);
    if (!target) problems.error(label, `"${value.id}" points at "${value.use_instead}", which is not in the list`);
    else if (target.retired) problems.error(label, `"${value.id}" points at "${value.use_instead}", which is retired too`);
  }
}

/** The value a tag stands for today: itself, or the one that replaced it. */
export const liveTag = (values, id) => values.get(id)?.use_instead ?? id;

/** Checks one dossier's tags against the lists. */
export function checkTags(tags, lists, where, problems) {
  for (const facet of FACETS) {
    const used = [tags?.[facet] ?? []].flat();
    for (const id of used) {
      const value = lists[facet].get(id);
      if (!value) problems.error(where, `${facet} "${id}" is not in tags/${facet}.json. Pick a listed value, or add this one in its own pull request first`);
      else if (value.retired) problems.warn(where, `${facet} "${id}" is retired${value.use_instead ? `: use "${value.use_instead}"` : ""}`);
    }
  }
}
