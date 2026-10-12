// libs/common/src/dates.ts
export const APP_TIMEZONE = 'Africa/Casablanca';

// today's date in Morocco, as a UTC-midnight Date (matches @db.Date columns)
export function todayInAppTz(): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
  }).format(new Date()); // "2026-10-11"
  // console.log(`[todayInAppTz] Today's date in ${APP_TIMEZONE} is: ${day}`);
  return new Date(`${day}T00:00:00.000Z`);
}

// minutes since midnight in Morocco (e.g. 18:30 -> 1110)
export function minutesNowInAppTz(): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date())
    .split(':')
    .map(Number);
  return h * 60 + m;
}

// minutes since midnight from a Prisma @db.Time value (ignore the 1970-01-01 date part)
export function timeToMinutes(t: Date): number {
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}
