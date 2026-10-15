// apps/club-service/prisma/seed.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { configuration } from '../../../libs/common/src/config/configuration';

const url = configuration().database.url;
const schema = new URL(url).searchParams.get('schema') ?? undefined;

const adapter = new PrismaPg({ connectionString: url }, { schema });
const prisma = new PrismaClient({ adapter });

const COACH_ROLE = 2; // MemberRole.COACH

// coach_user_id = the id of the coach created by the auth seed (1..5 on a fresh database)
const clubs = [
  {
    name: 'Tennis',
    description: 'Tennis club',
    coach_user_id: 1,
    slug: 'tennis',
    avatar: null,
  },
  {
    name: 'Padel',
    description: 'Padel club',
    coach_user_id: 2,
    slug: 'padel',
    avatar: null,
  },
  {
    name: 'Badminton',
    description: 'Badminton club',
    coach_user_id: 3,
    slug: 'badminton',
    avatar: null,
  },
  {
    name: 'Squash',
    description: 'Squash club',
    coach_user_id: 4,
    slug: 'squash',
    avatar: null,
  },
  {
    name: 'Table Tennis',
    description: 'Table tennis club',
    coach_user_id: 5,
    slug: 'table-tennis',
    avatar: null,
  },
  {
    name: 'Pickleball',
    description: 'Pickleball club',
    coach_user_id: 5,
    slug: 'pickleball',
    avatar: null,
  },
];

async function main() {
  for (const { coach_user_id, ...data } of clubs) {
    const club = await prisma.club.upsert({
      where: { name: data.name }, // safe to run many times
      update: {},
      create: data,
    });

    const coach = await prisma.member.upsert({
      where: { club_id_user_id: { club_id: club.id, user_id: coach_user_id } },
      update: {},
      create: { club_id: club.id, user_id: coach_user_id, role: COACH_ROLE },
    });

    await seedMembers(club.id);
    await seedSessions(club.id);
    await seedAnnouncements(club.id, coach.id);
    await seedTeamsAndMatches(club.id);
    await seedAttendance(club.id);
    await seedAchievements(club.id);
  }
  console.log(`Seeded ${clubs.length} clubs with their coaches`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

const LEADER_IDS = [6, 7]; // fake user ids, not in auth
const MEMBER_IDS = [8, 9, 10, 11, 12, 13, 14, 15];

const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

async function seedMembers(clubId: number) {
  await prisma.member.createMany({
    data: [
      ...LEADER_IDS.map((user_id) => ({ club_id: clubId, user_id, role: 1 })),
      ...MEMBER_IDS.map((user_id) => ({ club_id: clubId, user_id, role: 0 })),
    ],
    skipDuplicates: true, // the (club_id, user_id) unique key makes reruns safe
  });
}

const TEMPLATES = [
  {
    weekday: 1,
    start: '17:00',
    duration_minutes: 120,
    capacity: 12,
    title: 'Beginners',
    location: 'Court 1',
  },
  {
    weekday: 3,
    start: '17:00',
    duration_minutes: 120,
    capacity: 8,
    title: 'Advanced',
    location: 'Court 2',
  },
];

async function seedSessions(clubId: number) {
  if (await prisma.sessionTemplate.count({ where: { club_id: clubId } }))
    return;

  for (const t of TEMPLATES) {
    const template = await prisma.sessionTemplate.create({
      data: {
        club_id: clubId,
        weekday: t.weekday,
        start_time: t.start,
        duration_minutes: t.duration_minutes,
        capacity: t.capacity,
        title: t.title,
        location: t.location,
      },
    });

    // 3 past sessions (for history) and 2 upcoming ones
    const dates = [...lastDates(t.weekday, 3), ...nextDates(t.weekday, 2)];
    await prisma.session.createMany({
      data: dates.map((d) => {
        const start_at = at(d, t.start);
        return {
          club_id: clubId,
          template_id: template.id,
          start_at,
          end_at: new Date(start_at.getTime() + t.duration_minutes * 60_000),
          title: t.title,
          location: t.location,
          capacity: t.capacity,
        };
      }),
    });
  }
}

async function seedAnnouncements(clubId: number, coachMemberId: number) {
  if (await prisma.announcement.count({ where: { club_id: clubId } })) return;
  await prisma.announcement.createMany({
    data: [
      {
        club_id: clubId,
        announcer_id: coachMemberId,
        description: 'Welcome to the new season!',
      },
      {
        club_id: clubId,
        announcer_id: coachMemberId,
        description: 'Sessions start this Monday at 17:00.',
      },
    ],
  });
}

async function seedTeamsAndMatches(clubId: number) {
  if (await prisma.match.count({ where: { club_id: clubId } })) return; // rerun-safe

  const players = await prisma.member.findMany({
    where: { club_id: clubId, role: 0 },
    orderBy: { id: 'asc' },
  });
  const [referee] = await prisma.member.findMany({
    where: { club_id: clubId, role: 1 },
    orderBy: { id: 'asc' },
  });

  const newTeam = (p1: number, p2?: number) =>
    prisma.team.create({
      data: { club_id: clubId, player1_id: p1, player2_id: p2 ?? null },
    });

  // 4 singles teams, 2 doubles teams
  const [s1, s2, s3, s4] = await Promise.all(
    players.slice(0, 4).map((m) => newTeam(m.id)),
  );
  const [d1, d2] = await Promise.all([
    newTeam(players[4].id, players[5].id),
    newTeam(players[6].id, players[7].id),
  ]);

  const at = (days: number) => new Date(Date.now() + days * 86_400_000);
  const base = { club_id: clubId, ref_id: referee.id };

  await prisma.match.createMany({
    data: [
      // finished (status 2). Points are a placeholder: winner +10, loser -5
      {
        ...base,
        team1_id: s1.id,
        team2_id: s2.id,
        winner_id: s1.id,
        team1_score: 21,
        team2_score: 15,
        team1_points: 10,
        team2_points: -5,
        mode: 1,
        status: 2,
        scheduled_at: at(-7),
      },
      {
        ...base,
        team1_id: s3.id,
        team2_id: s4.id,
        winner_id: s4.id,
        team1_score: 18,
        team2_score: 21,
        team1_points: -5,
        team2_points: 10,
        mode: 1,
        status: 2,
        scheduled_at: at(-3),
      },
      {
        ...base,
        team1_id: d1.id,
        team2_id: d2.id,
        winner_id: d1.id,
        team1_score: 21,
        team2_score: 19,
        team1_points: 10,
        team2_points: -5,
        mode: 2,
        status: 2,
        scheduled_at: at(-1),
      },
      // confirmed, upcoming (status 1)
      {
        ...base,
        team1_id: s1.id,
        team2_id: s3.id,
        mode: 1,
        status: 1,
        scheduled_at: at(2),
      },
      // pending, waiting for the referee (status 0)
      {
        ...base,
        team1_id: s2.id,
        team2_id: s4.id,
        mode: 1,
        status: 0,
        scheduled_at: at(5),
      },
    ],
  });
}

// the next `count` dates (after today) that fall on `dayOfWeek`
function nextDates(dayOfWeek: number, count: number): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  while (out.length < count) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === dayOfWeek) out.push(new Date(d));
  }
  return out;
}

// date + "HH:mm" in Casablanca time (UTC+0)
const at = (d: Date, hhmm: string) =>
  new Date(`${d.toISOString().slice(0, 10)}T${hhmm}:00+00:00`);

// the last `count` dates (before today) that fall on `dayOfWeek` (0 = Sunday)
function lastDates(dayOfWeek: number, count: number): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  while (out.length < count) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (d.getUTCDay() === dayOfWeek) out.push(new Date(d));
  }
  return out;
}

async function seedAttendance(clubId: number) {
  if (
    await prisma.sessionAttend.count({
      where: { session: { club_id: clubId } },
    })
  )
    return;

  // only past sessions get attendance
  const sessions = await prisma.session.findMany({
    where: { club_id: clubId, start_at: { lt: new Date() } },
    orderBy: { start_at: 'asc' },
  });
  const members = await prisma.member.findMany({
    where: { club_id: clubId },
    orderBy: { id: 'asc' },
  });

  const data = sessions.flatMap((s, i) =>
    // 6 to 8 people, so the counts differ and never pass the capacity (8)
    members
      .slice(0, 6 + (i % 3))
      .map((m) => ({ session_id: s.id, member_id: m.id })),
  );
  await prisma.sessionAttend.createMany({ data, skipDuplicates: true });
}

async function seedAchievements(clubId: number) {
  if (await prisma.achievement.count({ where: { club_id: clubId } })) return;

  const players = await prisma.member.findMany({
    where: { club_id: clubId, role: 0 },
    orderBy: { id: 'asc' },
    take: 3,
  });
  const names = ['Season Champion', 'Most Improved', 'Perfect Attendance'];
  await prisma.achievement.createMany({
    data: players.map((p, i) => ({
      club_id: clubId,
      user_id: p.user_id,
      name: names[i],
      description: `${names[i]} this season`,
    })),
  });
}
