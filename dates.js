// dates.js: show dates the Indian way, and count the days to a deadline.
// Part of rupee-kit. SPEC.md says exactly what each function must do.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000; // India is 5 hours 30 minutes ahead of UTC, all year.

// A Date, an ISO string or a timestamp → a valid Date, or null.
function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-11-01T06:30:00Z" → "1 Nov 2026". Missing or invalid → "". */
export function formatDateIN(value) {
  const date = toDate(value);
  if (!date) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Whole days from today (in India) to a "YYYY-MM-DD" deadline. 0 on the day, negative after it. */
export function daysLeft(deadline, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(deadline ?? ""));
  if (!match) return null;
  const deadlineDay = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS;
  const today = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS);
  return deadlineDay - today;
}
