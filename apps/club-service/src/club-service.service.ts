import { Club } from '@app/contracts/club/club.types.js';
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
  async getClubByName(clubName: string): Promise<Club> {
    const club = await this.prisma.club.findUnique({ where: { name: clubName } });
    if (!club) {
      console.log(`[ClubService] Club with name "${clubName}" not found`);
      throw rpcError(404, 'Club not found', 'Not Found');
    }
    return {
      ...club,
      created_at: club.created_at.toISOString(),
    };
  }
}
