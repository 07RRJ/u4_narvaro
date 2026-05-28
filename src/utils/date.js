// src/utils/date.js
// All week math lives here. Routes and templates import from this file only.
//
// IMPORTANT: All date strings are local-date (YYYY-MM-DD) derived from the
// server's local clock, NOT from UTC. Using toISOString() would shift the date
// by the UTC offset on machines east of UTC (e.g. a server in UTC+2 would
// return the previous day at midnight local time). We use local getters instead.

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Format a Date object as a local YYYY-MM-DD string (no UTC shift).
 */
function toLocalISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the Monday of the week that is `offset` weeks from today.
 * offset = 0  → this week's Monday
 * offset = -1 → last week's Monday
 */
export function getMondayOfWeek(offset = 0) {
  const now = new Date();
  const dow = now.getDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Returns an array of 5 local ISO date strings (YYYY-MM-DD) for Mon–Fri
 * of the week at the given offset.
 */
export function getWeekDates(offset = 0) {
  const monday = getMondayOfWeek(offset);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toLocalISO(d);   // ← local date, not UTC
  });
}

/**
 * ISO week number (1–53) for a given date.
 */
export function getISOWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

/**
 * Human-readable label for the week navigator.
 * e.g. "Week 20 · Apr 28 – May 2"
 */
export function weekLabel(offset = 0) {
  const dates = getWeekDates(offset);
  const start = new Date(dates[0] + 'T00:00:00');
  const end   = new Date(dates[4] + 'T00:00:00');
  const weekNum = getISOWeekNumber(start);

  const fmt = (d) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
  return `Week ${weekNum} · ${fmt(start)} – ${fmt(end)}`;
}

/**
 * Returns today's local ISO date string (YYYY-MM-DD).
 */
export function todayISO() {
  return toLocalISO(new Date());
}

/**
 * Returns true if the given ISO date string is strictly after today (local).
 */
export function isFutureDate(isoDate) {
  return isoDate > todayISO();
}

/**
 * Returns the day name for a given ISO date string (e.g. "Monday").
 * Parses as local midnight to avoid UTC day-shift.
 */
export function dayName(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0 … Fri=4
  return DAY_NAMES[idx];
}

/**
 * Formats an ISO date as "Apr 28".
 * Parses as local midnight to avoid UTC day-shift.
 */
export function shortDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}
