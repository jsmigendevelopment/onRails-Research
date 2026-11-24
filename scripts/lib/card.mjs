// dossier.json: the card. The schema checks its shape; this file checks what a schema can't.
import { addMonths, validDate } from "./dates.mjs";
import { loadSchema, validate } from "./schema.mjs";
import { ID } from "./store.mjs";
import { checkTags } from "./tags.mjs";

const WARN_MONTHS = 6, MAX_MONTHS = 12;
const BUMPS = ["corrected", "rechecked"];

function checkDates(card, where, today, problems) {
  for (const field of ["created", "checked"]) if (!validDate(card[field])) return problems.error(where, `${field} must be a real date, YYYY-MM-DD`);
  if (card.checked < card.created) problems.error(where, "checked is before created");
  if (card.checked > today) problems.error(where, `checked (${card.checked}) is in the future`);
  if (card.status !== "current") return;
  if (!validDate(card.recheck)) return problems.error(where, "a current dossier needs a recheck date, YYYY-MM-DD");
  if (card.recheck <= card.checked) problems.error(where, "recheck must be after checked");
  else if (card.recheck > addMonths(card.checked, MAX_MONTHS)) problems.error(where, `recheck is more than ${MAX_MONTHS} months after checked`);
  else if (card.recheck > addMonths(card.checked, WARN_MONTHS)) problems.warn(where, `recheck is more than ${WARN_MONTHS} months after checked: fine for slow-moving facts only`);
}

function checkHistory(card, where, problems) {
  const history = Array.isArray(card.history) ? card.history : [];
  if (!history.length) return;
  if (history[0].change !== "published" || history[0].version !== 1) problems.error(where, 'history must start with version 1, change "published"');
  if (history[0].date !== card.created) problems.error(where, "the first history entry's date must be the created date");
  let version = 1;
  history.forEach((entry, n) => {
    if (n === 0) return;
    if (entry.date < history[n - 1].date) problems.error(where, `history[${n}] is dated before the entry above it`);
    if (BUMPS.includes(entry.change)) version++;
    if (entry.version !== version) problems.error(where, `history[${n}] should have version ${version}: only "corrected" and "rechecked" raise it, by 1`);
  });
  if (card.version !== version) problems.error(where, `version must be ${version}, the last version in history`);
  const last = history.findLast((e) => e.change === "published" || e.change === "rechecked");
  if (last && card.checked !== last.date) problems.error(where, `checked must be ${last.date}, the date of the last "published" or "rechecked" entry`);
}

function checkLifecycle(card, where, problems) {
  const changes = new Set((card.history ?? []).map((e) => e.change));
  if (card.status === "superseded") {
    if (!card.superseded_by) problems.error(where, "a superseded dossier names its replacement in superseded_by");
    if (!changes.has("superseded")) problems.error(where, 'a superseded dossier needs a "superseded" history entry');
  } else if (card.superseded_by) problems.error(where, `superseded_by is set, so status must be "superseded"`);
  if (card.status === "retracted") {
    if (!card.retraction) problems.error(where, "a retracted dossier says why in retraction: { date, reason }");
    if (!changes.has("retracted")) problems.error(where, 'a retracted dossier needs a "retracted" history entry');
  } else if (card.retraction) problems.error(where, `retraction is set, so status must be "retracted"`);
  if ((card.supersedes ?? []).includes(card.id) || card.superseded_by === card.id) problems.error(where, "a dossier can't supersede itself");
}

/** Checks one card. `folder` is the folder name it sits in. */
export function checkCard(card, { root, folder, where, lists, today }, problems) {
  validate(card, loadSchema(root, "dossier"), where, problems.error);
  if (card.id !== folder) problems.error(where, `id must be the folder name, "${folder}"`);
  if (typeof card.id === "string" && ID.test(card.id) && card.created !== card.id.slice(0, 10)) problems.error(where, `created must be ${card.id.slice(0, 10)}, the date in the id`);
  checkDates(card, where, today, problems);
  checkHistory(card, where, problems);
  checkLifecycle(card, where, problems);
  checkTags(card.tags, lists, where, problems);
}

/** Checks the links between cards: every superseding pair is written on both sides. */
export function checkLinks(cards, problems) {
  for (const [id, card] of cards) {
    const where = `${id}/dossier.json`;
    for (const old of card.supersedes ?? []) {
      const target = cards.get(old);
      if (!target) problems.error(where, `supersedes "${old}", which is not in the commons`);
      else if (target.superseded_by !== id) problems.error(where, `supersedes "${old}", but that dossier's superseded_by is not "${id}"`);
    }
    if (!card.superseded_by) continue;
    const next = cards.get(card.superseded_by);
    if (!next) problems.error(where, `superseded_by "${card.superseded_by}", which is not in the commons`);
    else if (!(next.supersedes ?? []).includes(id)) problems.error(where, `superseded_by "${card.superseded_by}", but that dossier's supersedes does not list "${id}"`);
  }
}
