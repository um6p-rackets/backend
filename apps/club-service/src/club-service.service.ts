import { Club, ClubMemberStatus, ClubWithMembersCount } from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { ClubAccessService } from './access/club-access.service.js';


@Injectable()
export class ClubServiceService {
  constructor(private readonly prisma: PrismaService, private readonly clubAccessService: ClubAccessService   ) {}
  async getAllClubs(): Promise<Club[]> {
    const result = await this.prisma.club.findMany({ orderBy: { name: 'asc' } });
    return result.map((club) => ({
          ...club,
          created_at: club.created_at.toISOString(),
        }));
  }

  async getClubWithMembersCount(clubSlug: string): Promise<ClubWithMembersCount> {
    console.log(`[ClubService] Fetching club with slug: ${clubSlug}`);
    const club = await this.prisma.club.findUnique({ where: { slug: clubSlug } });
    if (!club) {
      console.log(`[ClubService] Club with slug "${clubSlug}" not found`);
      throw rpcError(404, 'Club not found', 'Not Found');
    }
    const membersCount = await this.prisma.member.count({ where: { club_id: club.id } });
    return {
      ...club,
      created_at: club.created_at.toISOString(),
      members_count: membersCount, 
    };
  }

  async getClubStatus(clubSlug: string, userId: number): Promise<ClubMemberStatus> 
  {
      const club = await this.clubAccessService.getClub(clubSlug);
      const member = await this.clubAccessService.findMember(club.id, userId);

      return {
        is_member: !!member,
        member_id: member ? member.id : null,
        role: member ? member.role : null,
      };
  }
}