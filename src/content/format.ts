// Public date formatting: English, and America/Chicago for timestamps (DESIGN.md §4.5).

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const calendarDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const localDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'America/Chicago' });

/**
 * Formats an ISO date or timestamp as e.g. "October 30, 2020". A date-only value is a
 * calendar date, not midnight UTC, so it is formatted in UTC to avoid showing the day
 * before in Austin.
 */
export function formatDate(iso: string): string {
  return DATE_ONLY.test(iso) ? calendarDate.format(new Date(`${iso}T00:00:00Z`)) : localDate.format(new Date(iso));
}
