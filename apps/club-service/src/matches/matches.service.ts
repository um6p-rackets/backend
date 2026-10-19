import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClientProxy } from '@nestjs/microservices';
import { ClubAccessService } from '../access/club-access.service.js';
import { AUTH_PATTERNS, AUTH_SERVICE, rpcError, User } from '@app/contracts';
import {
  MatchesQueryDto,
  MatchRequestDto,
} from '@app/contracts/club/dto/index.js';
import {
  MatchDetail,
  MatchStatus,
  MemberRole,
  Paginated,
  Player,
  UserSummary,
} from '@app/contracts/club/index.js';
import { rpc } from '@app/common';

const memberSelect = { select: { id: true, user_id: true } } as const;
const teamInclude = {
  include: { player1: memberSelect, player2: memberSelect },
} as const;

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
      throw rpcError(
        400,
        'Scheduled time must be in the future',
        'Bad Request',
      );
    }
    // check mode and number of players
    if (body.mode === 1 && body.opponent_ids.length !== 1) {
      throw rpcError(
        400,
        'Singles match must have exactly 1 opponent',
        'Bad Request',
      );
    } else if (body.mode === 2 && body.opponent_ids.length !== 2) {
      throw rpcError(
        400,
        'Doubles match must have exactly 2 opponents',
        'Bad Request',
      );
    } else if (body.mode === 2 && !body.partner_id) {
      throw rpcError(400, 'Doubles match must have a partner', 'Bad Request');
    } else if (body.mode === 1 && body.partner_id) {
      throw rpcError(400, 'Singles match cannot have a partner', 'Bad Request');
    }

    // check that the players are not the same
    const allPlayerIds = [
      member.id,
      body.partner_id,
      ...body.opponent_ids,
    ].filter((id): id is number => id !== undefined);
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
      throw rpcError(
        404,
        'One or more opponents are not members of the club',
        'Not Found',
      );
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

  async getMatches(
    slug: string,
    user_id: number,
    query: MatchesQueryDto,
  ): Promise<Paginated<MatchDetail>> {
    const { club, member } = await this.clubAccessService.requireRole(
      slug,
      user_id,
      MemberRole.MEMBER,
    );

    const statusFilter = query.status === 'all' ? undefined : query.status;

    const matchStatusMap: Record<string, MatchStatus> = {
      pending: MatchStatus.PENDING,
      upcoming: MatchStatus.CONFIRMED,
      completed: MatchStatus.FINISHED,
      cancelled: MatchStatus.CANCELLED,
    };

    const whereClause: any = {
      club_id: club.id,
      ...(statusFilter !== undefined && {
        status: matchStatusMap[statusFilter],
      }),
    };

    // member can't see other members pending matches, but can see their own pending matches
    if (statusFilter === 'pending' && member.role === MemberRole.MEMBER) {
      whereClause.OR = [
        { team1: { player1_id: member.id } },
        { team1: { player2_id: member.id } },
        { team2: { player1_id: member.id } },
        { team2: { player2_id: member.id } },
      ];
    }

    if (query.mine) {
      whereClause.OR = [
        { team1: { player1_id: member.id } },
        { team1: { player2_id: member.id } },
        { team2: { player1_id: member.id } },
        { team2: { player2_id: member.id } },
        { ref_id: member.id },
      ];
    }

    // we can got just ids of members then get those members info and from member info we have user_id and then we can get user info from auth service
    const totalMatches = await this.prisma.match.count({ where: whereClause });

    // users see the last ended matches first
    // or the soonest upcoming matches first
    let orderByClause: any = { scheduled_at: 'asc' };
    if (statusFilter === 'completed') {
      orderByClause = { scheduled_at: 'desc' };
    }

    const matches = await this.prisma.match.findMany({
      where: whereClause,
      include: {
        club: { select: { id: true, name: true, slug: true } },
        team1: {
          include: {
            player1: { select: { id: true, user_id: true } },
            player2: { select: { id: true, user_id: true } },
          },
        },
        team2: {
          include: {
            player1: { select: { id: true, user_id: true } },
            player2: { select: { id: true, user_id: true } },
          },
        },
        referee: { select: { id: true, user_id: true } },
      },
      orderBy: orderByClause,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Get all unique member_id from the matches player_ids
    const memberIds = new Set<number>();
    matches.forEach((match) => {
      if (match.team1.player1_id) memberIds.add(match.team1.player1_id);
      if (match.team1.player2_id) memberIds.add(match.team1.player2_id);
      if (match.team2.player1_id) memberIds.add(match.team2.player1_id);
      if (match.team2.player2_id) memberIds.add(match.team2.player2_id);
      if (match.ref_id) memberIds.add(match.ref_id);
    });

    // Fetch all members in one query
    const members = await this.prisma.member.findMany({
      where: { id: { in: Array.from(memberIds) } },
      select: { id: true, user_id: true },
    });

    // Map member_id to user_id
    const memberIdToUserIdMap = new Map<number, number>();
    members.forEach((member) => {
      memberIdToUserIdMap.set(member.id, member.user_id);
    });

    // Fetch user info from auth service
    const user_ids = Array.from(memberIdToUserIdMap.values());
    const users: User[] = await rpc<User[]>(
      this.authClient,
      AUTH_PATTERNS.GET_USERS_BY_IDS,
      { user_ids: user_ids },
    );

    // Map user_id to user info
    const userIdToUserMap = new Map<number, User>();
    users.forEach((user) => {
      userIdToUserMap.set(user.id, user);
    });

    // Now we can construct the MatchDetail objects
    const matchDetails: MatchDetail[] = matches.map((match) => {
      const team1Player1User = userIdToUserMap.get(
        memberIdToUserIdMap.get(match.team1.player1_id)!,
      );
      const team1Player2User = match.team1.player2_id
        ? userIdToUserMap.get(memberIdToUserIdMap.get(match.team1.player2_id)!)
        : null;
      const team2Player1User = userIdToUserMap.get(
        memberIdToUserIdMap.get(match.team2.player1_id)!,
      );
      const team2Player2User = match.team2.player2_id
        ? userIdToUserMap.get(memberIdToUserIdMap.get(match.team2.player2_id)!)
        : null;

      // Referee can be null
      const refereeUser = match.ref_id
        ? userIdToUserMap.get(memberIdToUserIdMap.get(match.ref_id)!)
        : null;

      // p1,p2,p3,p4 and referee Users need one extra property member_id
      // the easy way to add it to user_summary is to find the member_id from the memberIdToUserIdMap and add it to the user object
      const team1_p1: Player | undefined = {
        ...team1Player1User!,
        member_id: match.team1.player1_id,
      };
      const team1_p2: Player | null = team1Player2User
        ? { ...team1Player2User, member_id: match.team1.player2_id! }
        : null;
      const team2_p1: Player | undefined = {
        ...team2Player1User!,
        member_id: match.team2.player1_id,
      };
      const team2_p2: Player | null = team2Player2User
        ? { ...team2Player2User, member_id: match.team2.player2_id! }
        : null;
      const referee: Player | null = refereeUser
        ? { ...refereeUser, member_id: match.ref_id! }
        : null;

      return {
        ...match,
        team1: {
          ...match.team1,
          player1: team1_p1!,
          player2: team1_p2,
          created_at: match.team1.created_at.toISOString(),
        },
        team2: {
          ...match.team2,
          player1: team2_p1!,
          player2: team2_p2,
          created_at: match.team2.created_at.toISOString(),
        },
        scheduled_at: match.scheduled_at.toISOString(),
        cancelled_at: match.cancelled_at
          ? match.cancelled_at.toISOString()
          : null,
        created_at: match.created_at.toISOString(),
        referee: referee,
      };
    });

    return {
      data: matchDetails,
      page: query.page,
      limit: query.limit,
      total: totalMatches,
    };
  }

  async getMatch(
    slug: string,
    user_id: number,
    match_id: number,
  ): Promise<MatchDetail> {
    const { club, member } = await this.clubAccessService.requireRole(
      slug,
      user_id,
      MemberRole.MEMBER,
    );

    const match = await this.prisma.match.findUnique({
      where: { club_id: club.id, id: match_id },
      include: {
        club: { select: { id: true, name: true, slug: true } },
        team1: teamInclude,
        team2: teamInclude,
        referee: memberSelect,
      },
    });
    if (!match) throw rpcError(404, 'Match not found', 'Not Found');

    // everyone in this match: up to 4 players and the referee
    const people = [
      match.team1.player1,
      match.team1.player2,
      match.team2.player1,
      match.team2.player2,
      match.referee,
    ].flatMap((m) => (m ? [m] : []));

    // a plain member cannot see a pending match they are not part of
    const isInMatch = people.some((m) => m.id === member.id);
    if (
      !isInMatch &&
      member.role === MemberRole.MEMBER &&
      match.status === MatchStatus.PENDING
    ) {
      throw rpcError(
        403,
        'You do not have permission to view this match',
        'Forbidden',
      );
    }

    // user info comes from the auth service
    const users = await rpc<User[]>(
      this.authClient,
      AUTH_PATTERNS.GET_USERS_BY_IDS,
      {
        user_ids: people.map((m) => m.user_id),
      },
    );
    const userById = new Map(users.map((u) => [u.id, u]));

    const toPlayer = (m: { id: number; user_id: number }): Player => ({
      ...userById.get(m.user_id)!,
      member_id: m.id,
    });
    const toTeam = (team: typeof match.team1) => ({
      ...team,
      player1: toPlayer(team.player1),
      player2: team.player2 ? toPlayer(team.player2) : null,
      created_at: team.created_at.toISOString(),
    });

    return {
      ...match,
      team1: toTeam(match.team1),
      team2: toTeam(match.team2),
      referee: match.referee ? toPlayer(match.referee) : null,
      scheduled_at: match.scheduled_at.toISOString(),
      cancelled_at: match.cancelled_at?.toISOString() ?? null,
      created_at: match.created_at.toISOString(),
    };
  }

  async acceptMatch(
    slug: string,
    user_id: number,
    match_id: number,
  ): Promise<{ status: number; message: string }> {
    const { club, member } = await this.clubAccessService.requireRole(
      slug,
      user_id,
      MemberRole.LEADER,
    );

    const match = await this.prisma.match.findUnique({
      where: { club_id: club.id, id: match_id },
      include: {
        team1: teamInclude,
        team2: teamInclude,
      },
    });
    if (!match) throw rpcError(404, 'Match not found', 'Not Found');

    if (match.status !== MatchStatus.PENDING) {
      throw rpcError(
        400,
        'Only pending matches can be accepted',
        'Bad Request',
      );
    }

    // accept the match
    await this.prisma.match.update({
      where: { club_id: club.id, id: match_id },
      data: { status: MatchStatus.CONFIRMED, ref_id: member.id },
    });

    return { status: 200, message: 'Match accepted successfully' };
  }
}
