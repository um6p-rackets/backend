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

async function seedSessions(clubId: number) {
  if (await prisma.weekSession.count({ where: { club_id: clubId } })) return; // only if empty
  await prisma.weekSession.createMany({
    data: [
      {
        club_id: clubId,
        day_of_week: 1,
        start_time: time('17:00'),
        end_time: time('19:00'),
      },
      {
        club_id: clubId,
        day_of_week: 3,
        start_time: time('17:00'),
        end_time: time('19:00'),
      },
    ],
  });
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
