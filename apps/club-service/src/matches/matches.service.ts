import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClientProxy } from '@nestjs/microservices';
import { ClubAccessService } from '../access/club-access.service.js';
import { AUTH_SERVICE, rpcError } from '@app/contracts';
import { MatchRequestDto } from '@app/contracts/club/dto/index.js';
import { MatchStatus, MemberRole } from '@app/contracts/club/index.js';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly clubAccessService: ClubAccessService,
  ) {}

  async requestMatch(
    slug: string,
    user_id: number,
    body: MatchRequestDto,
  ): Promise<{ status: number; message: string; pending_match_id: number }> {
    const { club, member } = await this.clubAccessService.requireRole(
      slug,
      user_id,
      MemberRole.MEMBER,
    ); // 0 = MEMBER role

    // schedule at must be in the future
    const scheduledAt = new Date(body.scheduled_at);
    if (scheduledAt <= new Date()) {
      throw rpcError(400, 'Scheduled time must be in the future', 'Bad Request');
    }
    // check mode and number of players
    if (body.mode === 1 && body.opponent_ids.length !== 1) {
      throw rpcError(400, 'Singles match must have exactly 1 opponent', 'Bad Request');
    } else if (body.mode === 2 && body.opponent_ids.length !== 2) {
      throw rpcError(400, 'Doubles match must have exactly 2 opponents', 'Bad Request');
    } else if (body.mode === 2 && !body.partner_id) {
      throw rpcError(400, 'Doubles match must have a partner', 'Bad Request');
    } else if (body.mode === 1 && body.partner_id) {
      throw rpcError(400, 'Singles match cannot have a partner', 'Bad Request');
    }

    // check that the players are not the same
    const allPlayerIds = [member.id, body.partner_id, ...body.opponent_ids].filter(
      (id): id is number => id !== undefined,
    );
    const uniquePlayerIds = new Set(allPlayerIds);
    if (uniquePlayerIds.size !== allPlayerIds.length) {
      throw rpcError(400, 'Players must be unique', 'Bad Request');
    }


    // validate that the partner_id is a member of the club if provided
    if (body.partner_id) {
      const partnerMember = await this.prisma.member.findFirst({
        where: {
          club_id: club.id,
          id: body.partner_id,
          left_at: null, // ensure the partner is an active member
        },
      });

      if (!partnerMember) {
        throw rpcError(404, 'Partner is not a member of the club', 'Not Found');
      }
    }
    // Validate that the opponents are members of the same club
    const opponentMembers = await this.prisma.member.findMany({
      where: {
        club_id: club.id,
        id: { in: body.opponent_ids },
        left_at: null, // ensure the opponents are active members
      },
      select: { id: true }, // only select the id to minimize data transfer
    });

    if (opponentMembers.length !== body.opponent_ids.length) {
      throw rpcError(404, 'One or more opponents are not members of the club', 'Not Found');
    }

    // create team 1 
    const team1 = await this.prisma.team.create({
      data: {
        club_id: club.id,
        player1_id: member.id,
        player2_id: body.partner_id || null,
      },
    });

    // create team 2
    const team2 = await this.prisma.team.create({
      data: {
        club_id: club.id,
        player1_id: body.opponent_ids[0],
        player2_id: body.opponent_ids[1] || null,
      },
    });

    // Create the pending match request in the database
    const pendingMatch = await this.prisma.match.create({
      data: {
        club_id: club.id,
        team1_id: team1.id,
        team2_id: team2.id,
        mode: body.mode,
        status: MatchStatus.PENDING,
        location: body.location || null,
        scheduled_at: new Date(body.scheduled_at),
      },
    });


    return {
      status: 200,
      message: 'Match request created successfully',
      pending_match_id: pendingMatch.id,
    };
  }
}
