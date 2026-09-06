import {toIsoDate, todayIso} from '@/data/events';

/**
 * Reading the date and time boxes on the request form.
 *
 * Pure and self-contained so the wording people actually type can be checked
 * without standing up the screen around it.
 */
const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

/**
 * Reads what people actually type into the date box: "12 Sep", "12/09",
 * "2026-09-12". A bare day and month is taken as the next one to come, so
 * typing "12 Sep" in December means next year rather than a date in the past.
 */
export function parseDate(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (text.length === 0) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const today = new Date();
  let day: number | undefined;
  let month: number | undefined;

  const worded = text.match(/^(\d{1,2})\s*([a-z]{3,})$/);
  if (worded) {
    day = Number(worded[1]);
    month = MONTHS.indexOf(worded[2]!.slice(0, 3));
    if (month === -1) {
      return null;
    }
  } else {
    const numeric = text.match(/^(\d{1,2})[./-](\d{1,2})$/);
    if (!numeric) {
      return null;
    }
    day = Number(numeric[1]);
    month = Number(numeric[2]) - 1;
  }

  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }
  let candidate = new Date(today.getFullYear(), month, day);
  if (toIsoDate(candidate) < todayIso()) {
    candidate = new Date(today.getFullYear() + 1, month, day);
  }
  // A day that rolled over (31 Feb) is not the date anyone meant.
  return candidate.getDate() === day ? toIsoDate(candidate) : null;
}

/** "18:00" or "18.00" or "18" — returns start and a two-hour default end. */
export function parseTime(input: string): {startTime: string; endTime: string} | null {
  const match = input.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return {
    startTime: `${pad(hours)}:${pad(minutes)}`,
    endTime: `${pad((hours + 2) % 24)}:${pad(minutes)}`,
  };
}
