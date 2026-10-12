// libs/common/src/dates.ts
export const APP_TIMEZONE = 'Africa/Casablanca';

// today's date in Morocco, as a UTC-midnight Date (matches @db.Date columns)
export function todayInAppTz(): Date {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date()); // "2026-10-11"
  return new Date(`${day}T00:00:00.000Z`);
}