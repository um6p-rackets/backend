import {
  Club,
  ClubMemberStatus,
  ClubWithMembersCountAndCoachFullName,
  MemberRole,
} from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { ClubAccessService } from './access/club-access.service.js';
import { UpdateClubDto } from '@app/contracts/club/dto/index.js';
import { User } from '@app/contracts/auth/index.js';
import { rpc } from '@app/common/helpers/rpc.helper.js';
import { AUTH_PATTERNS } from '@app/contracts/patterns.js';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/queues.js';

@Injectable()
export class ClubServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubAccessService: ClubAccessService,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
  ) {}
  async getAllClubs(): Promise<Club[]> {
    const result = await this.prisma.club.findMany({
      orderBy: { name: 'asc' },
    });
    return result.map((club) => ({
      ...club,
      created_at: club.created_at.toISOString(),
    }));
  }

  async getClubWithMembersCountAndCoachFullName(
    clubSlug: string,
  ): Promise<ClubWithMembersCountAndCoachFullName> {
    console.log(`[ClubService] Fetching club with slug: ${clubSlug}`);
    const club = await this.prisma.club.findUnique({
      where: { slug: clubSlug },
    });
    if (!club) {
      console.log(`[ClubService] Club with slug "${clubSlug}" not found`);
      throw rpcError(404, 'Club not found', 'Not Found');
    }

    let coach: User | null = null;

    // get club coach full name
    const coachMember = await this.prisma.member.findFirst({
      where: { club_id: club.id, role: MemberRole.COACH },
    });

    if (coachMember) {
      coach = await rpc<User | null>(
        this.authClient,
        AUTH_PATTERNS.GET_USER_BY_ID,
        { user_id: coachMember.user_id },
      );
      if (!coach) {
        console.log(
          `[ClubService] User with id ${coachMember.user_id} not found for club with slug "${clubSlug}"`,
        );
      }
    } else {
      console.log(
        `[ClubService] No coach found for club with slug "${clubSlug}"`,
      );
    }

    const membersCount = await this.prisma.member.count({
      where: { club_id: club.id },
    });
    return {
      ...club,
      created_at: club.created_at.toISOString(),
      members_count: membersCount,
      coach_full_name: coach ? `${coach.first_name} ${coach.last_name}` : 'No Coach',
    };
  }

  async getClubStatus(
    clubSlug: string,
    user_id: number,
  ): Promise<ClubMemberStatus> {
    const club = await this.clubAccessService.getClub(clubSlug);
    const member = await this.clubAccessService.findMember(club.id, user_id);

    return {
      is_member: !!member,
      member_id: member ? member.id : null,
      role: member ? member.role : null,
    };
  }

  async updateClub(
    clubSlug: string,
    user_id: number,
    body: UpdateClubDto,
  ): Promise<Club> {
    const { club } = await this.clubAccessService.requireRole(
      clubSlug,
      user_id,
      MemberRole.COACH,
    ); // Ensure the user has at least COACH role to update the club

    let slug = club.slug;
    body.name = body.name?.trim();
    body.description = body.description?.trim();
    if (!body.name && !body.description) {
      throw rpcError(
        400,
        'At least one of name or description must be provided',
        'Bad Request',
      );
    }

    if (body.name) {
      slug = body.name.toLowerCase().replace(/\s+/g, '-'); // Generate slug from name if provided
    }

    // Check if the new slug already exists for another club
    if (slug !== club.slug) {
      const existingClub = await this.prisma.club.findUnique({
        where: { slug },
      });
      if (existingClub) {
        throw rpcError(400, 'Club name already exists', 'Bad Request');
      }
    }

    const updatedClub = await this.prisma.club.update({
      where: { id: club.id },
      data: {
        name: body.name ?? club.name,
        description: body.description ?? club.description,
        slug,
      },
    });

    return {
      ...updatedClub,
      created_at: updatedClub.created_at.toISOString(),
    };
  }
}
