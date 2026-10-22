// apps/club-service/prisma/seed.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { configuration } from '../../../libs/common/src/config/global-configuration';
import {
  addDays,
  addMinutes,
  mondayOf,
  today,
  toDate,
  toTime,
} from '../../../libs/common/src/dates';
import { AchievementCode } from '../../../libs/contracts/src/club/index.js';

const url = configuration().database.url;
const schema = new URL(url).searchParams.get('schema') ?? undefined;

const adapter = new PrismaPg({ connectionString: url }, { schema });
const prisma = new PrismaClient({ adapter });

// ==========================================
// Data
// ==========================================

const COACH_ROLE = 2; // MemberRole.COACH

// coach_user_id = the id of the coach created by the auth seed (1..5 on a fresh database)
const clubs = [
  {
    name: 'Tennis',
    slug: 'tennis',
    description: 'Tennis club',
    coach_user_id: 1,
    avatar: null,
  },
  {
    name: 'Padel',
    slug: 'padel',
    description: 'Padel club',
    coach_user_id: 2,
    avatar: null,
  },
  {
    name: 'Badminton',
    slug: 'badminton',
    description: 'Badminton club',
    coach_user_id: 3,
    avatar: null,
  },
  {
    name: 'Squash',
    slug: 'squash',
    description: 'Squash club',
    coach_user_id: 4,
    avatar: null,
  },
  {
    name: 'Table Tennis',
    slug: 'table-tennis',
    description: 'Table tennis club',
    coach_user_id: 5,
    avatar: null,
  },
];

const LEADER_IDS = [6, 7]; // fake user ids, not in auth
const MEMBER_IDS = [8, 9, 10, 11, 12, 13, 14, 15];

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

// ==========================================
// Seeds
// ==========================================

async function seedMembers(club_id: number) {
  await prisma.member.createMany({
    data: [
      ...LEADER_IDS.map((user_id) => ({ club_id: club_id, user_id, role: 1 })),
      ...MEMBER_IDS.map((user_id) => ({ club_id: club_id, user_id, role: 0 })),
    ],
    skipDuplicates: true, // the (club_id, user_id) unique key makes reruns safe
  });
}

async function seedSessions(club_id: number) {
  if (await prisma.sessionTemplate.count({ where: { club_id: club_id } }))
    return;

  const weekStart = mondayOf(today()); // Monday of the current week, "YYYY-MM-DD"

  for (const t of TEMPLATES) {
    const template = await prisma.sessionTemplate.create({
      data: {
        club_id: club_id,
        weekday: t.weekday,
        start_time: t.start,
        duration_minutes: t.duration_minutes,
        capacity: t.capacity,
        title: t.title,
        location: t.location,
      },
    });

    // 3 past weeks, this week and next week (the same horizon as the app)
    const data = [-3, -2, -1, 0, 1].map((week) => {
      const day = addDays(weekStart, week * 7 + ((t.weekday + 6) % 7)); // Monday = +0 ... Sunday = +6
      const start_at = toDate(day, t.start);
      return {
        club_id: club_id,
        template_id: template.id,
        start_at,
        end_at: addMinutes(start_at, t.duration_minutes),
        title: t.title,
        location: t.location,
        capacity: t.capacity,
      };
    });
    await prisma.session.createMany({ data });
  }
}

async function seedAttendance(club_id: number) {
  if (
    await prisma.sessionAttend.count({
      where: { session: { club_id: club_id } },
    })
  )
    return;

  // only sessions that already started get bookings
  const sessions = await prisma.session.findMany({
    where: { club_id: club_id, start_at: { lt: new Date() } },
    orderBy: { start_at: 'asc' },
  });
  const members = await prisma.member.findMany({
    where: { club_id: club_id },
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

async function seedAnnouncements(club_id: number, coachMemberId: number) {
  if (await prisma.announcement.count({ where: { club_id: club_id } })) return;
  await prisma.announcement.createMany({
    data: [
      {
        club_id: club_id,
        announcer_id: coachMemberId,
        description: 'Welcome to the new season!',
      },
      {
        club_id: club_id,
        announcer_id: coachMemberId,
        description: 'Sessions start this Monday at 17:00.',
      },
    ],
  });
}

async function seedTeamsAndMatches(club_id: number) {
  if (await prisma.match.count({ where: { club_id: club_id } })) return; // rerun-safe

  const players = await prisma.member.findMany({
    where: { club_id: club_id, role: 0 },
    orderBy: { id: 'asc' },
  });
  const [referee] = await prisma.member.findMany({
    where: { club_id: club_id, role: 1 },
    orderBy: { id: 'asc' },
  });

  const newTeam = (p1: number, p2?: number) =>
    prisma.team.create({
      data: { club_id: club_id, player1_id: p1, player2_id: p2 ?? null },
    });

  // 4 singles teams, 2 doubles teams
  const [s1, s2, s3, s4] = await Promise.all(
    players.slice(0, 4).map((m) => newTeam(m.id)),
  );
  const [d1, d2] = await Promise.all([
    newTeam(players[4].id, players[5].id),
    newTeam(players[6].id, players[7].id),
  ]);

  const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 86_400_000);
  const base = { club_id: club_id, ref_id: referee.id };

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
        scheduled_at: daysFromNow(-7),
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
        scheduled_at: daysFromNow(-3),
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
        scheduled_at: daysFromNow(-1),
      },
      // confirmed, upcoming (status 1)
      {
        ...base,
        team1_id: s1.id,
        team2_id: s3.id,
        mode: 1,
        status: 1,
        scheduled_at: daysFromNow(2),
      },
      // pending, waiting for the referee (status 0)
      {
        ...base,
        team1_id: s2.id,
        team2_id: s4.id,
        mode: 1,
        status: 0,
        scheduled_at: daysFromNow(5),
      },
    ],
  });
}

async function seedAchievements(
  club_id: number,
  coach: { id: number; user_id: number },
) {
  if (await prisma.achievement.count({ where: { club_id: club_id } })) return;

  const players = await prisma.member.findMany({
    where: { club_id: club_id, role: 0 },
    orderBy: { id: 'asc' },
    take: 3,
  });
  const given = [
    AchievementCode.SEASON_CHAMPION,
    AchievementCode.MOST_IMPROVED,
    AchievementCode.PERFECT_ATTENDANCE,
  ];

  await prisma.achievement.createMany({
    data: [
      // given by the coach
      ...players.map((p, i) => ({
        club_id: club_id,
        user_id: p.user_id,
        code: given[i],
        awarded_by: coach.id,
      })),
      // awarded automatically (awarded_by = null)
      {
        club_id: club_id,
        user_id: coach.user_id,
        code: AchievementCode.FOUNDING_MEMBER,
        awarded_by: null,
      },
      {
        club_id: club_id,
        user_id: players[0].user_id,
        code: AchievementCode.FIRST_WIN,
        awarded_by: null,
      },
      {
        club_id: club_id,
        user_id: players[1].user_id,
        code: AchievementCode.FIRST_SESSION,
        awarded_by: null,
      },
    ],
    skipDuplicates: true, // the (club_id, user_id, code) unique key makes reruns safe
  });
}

async function seedLeaderboard(club_id: number) {
  // Fetch up to 60 members to populate the leaderboard
  const members = await prisma.member.findMany({
    where: { club_id },
    take: 60,
  });

  for (const member of members) {
    // Generate realistic random statistics
    const wins = Math.floor(Math.random() * 30);       // 0 to 29 wins
    const losses = Math.floor(Math.random() * 20);     // 0 to 19 losses
    const total_matches = wins + losses;
    
    // Example formula: 10 points per win, -5 per loss, floor at 0
    const calculatedPoints = (wins * 10) - (losses * 5);
    const points = Math.max(0, calculatedPoints);

    const win_streak = Math.floor(Math.random() * 6);
    const best_win_streak = win_streak + Math.floor(Math.random() * 5);

    await prisma.leaderboard.upsert({
      where: { member_id: member.id }, 
      update: {},
      create: {
        club_id: club_id,
        user_id: member.user_id,
        member_id: member.id,
        points,
        wins,
        losses,
        total_matches,
        win_streak,
        best_win_streak,
      },
    });
  }
  console.log(`Seeded ${members.length} leaderboard rows for club ${club_id}`);
}

// ==========================================
// Run
// ==========================================

async function main() {
  for (const { coach_user_id, ...data } of clubs) {
    const club = await prisma.club.upsert({
      where: { slug: data.slug }, // safe to run many times
      update: {},
      create: data,
    });

    const coach = await prisma.member.upsert({
      where: { club_id_user_id: { club_id: club.id, user_id: coach_user_id } },
      update: {},
      create: { club_id: club.id, user_id: coach_user_id, role: COACH_ROLE },
    });

    await seedMembers(club.id);
    await seedLeaderboard(club.id);
    await seedSessions(club.id);
    await seedAttendance(club.id); // needs the sessions
    await seedAnnouncements(club.id, coach.id);
    await seedTeamsAndMatches(club.id);
    await seedAchievements(club.id, coach);
  }
  console.log(`Seeded ${clubs.length} clubs with their coaches`);
}

// keep this call at the very bottom, after every const above is defined
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
