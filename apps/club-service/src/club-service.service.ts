import { Club, ClubWithMembersCount } from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';


@Injectable()
export class ClubServiceService {
  constructor(private readonly prisma: PrismaService) {}
  async getAllClubs(): Promise<Club[]> {
    const result = await this.prisma.club.findMany({ orderBy: { name: 'asc' } });
    return result.map((club) => ({
          ...club,
          created_at: club.created_at.toISOString(),
        }));
  }

  async getClubBySlug(clubSlug: string): Promise<ClubWithMembersCount> {
    console.log(`[ClubService] Fetching club with slug: ${clubSlug}`);
    const club = await this.prisma.club.findUnique({ where: { slug: clubSlug } });
    if (!club) {
      console.log(`[ClubService] Club with slug "${clubSlug}" not found`);
      throw rpcError(404, 'Club not found', 'Not Found');
    }
    return {
      ...club,
      created_at: club.created_at.toISOString(),
      // random member counter for now, we will implement a real one later
      members_count: Math.floor(Math.random() * 1000) + 1, // random number between 1 and 1000
    };
  }
}
