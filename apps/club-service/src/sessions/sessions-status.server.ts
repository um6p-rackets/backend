import { minutesNowInAppTz, timeToMinutes, todayInAppTz } from '@app/common';

export function sessionState(
  sessionDate: Date,
  session: { start_time: Date; end_time: Date },
): 'past' | 'ongoing' | 'upcoming' {
  const today = todayInAppTz(); // Date at UTC midnight
  const nowMin = minutesNowInAppTz();
  const start = timeToMinutes(session.start_time);
  const end = timeToMinutes(session.end_time);
  const d = sessionDate.getTime();
  const t = today.getTime();
  if (d < t) return 'past';
  if (d > t) return 'upcoming';
  if (nowMin >= end) return 'past';
  if (nowMin >= start) return 'ongoing';
  return 'upcoming';
}
