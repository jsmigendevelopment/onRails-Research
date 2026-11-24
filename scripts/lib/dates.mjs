const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day written YYYY-MM-DD. */
export const validDate = (s) =>
  typeof s === "string" && DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/** The day part of a date or timestamp. */
export const dayOf = (s) => (typeof s === "string" ? s.slice(0, 10) : "");

export const knownDate = (s) => s !== "unknown" && validDate(dayOf(s));

export function addMonths(day, months) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export const today = () => new Date().toISOString().slice(0, 10);
