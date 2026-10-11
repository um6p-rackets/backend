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
  { name: 'Tennis', description: 'Tennis club', coach_user_id: 1 },
  { name: 'Padel', description: 'Padel club', coach_user_id: 2 },
  { name: 'Badminton', description: 'Badminton club', coach_user_id: 3 },
  { name: 'Squash', description: 'Squash club', coach_user_id: 4 },
  { name: 'Table Tennis', description: 'Table tennis club', coach_user_id: 5 },
];

async function main() {
  for (const { coach_user_id, ...data } of clubs) {
    const club = await prisma.club.upsert({
      where: { name: data.name }, // safe to run many times
      update: {},
      create: data,
    });

    await prisma.member.upsert({
      where: { club_id_user_id: { club_id: club.id, user_id: coach_user_id } },
      update: {},
      create: { club_id: club.id, user_id: coach_user_id, role: COACH_ROLE },
    });
  }
  console.log(`Seeded ${clubs.length} clubs with their coaches`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());