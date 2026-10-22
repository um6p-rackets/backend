import {
  Club,
  ClubMemberStatus,
  ClubWithMembersCountAndCoachFullName,
  JoinClubResponse,
  JoinRequestStatus,
  JoinRequestWithUser,
  Leaderboard,
  MatchStatus,
  MemberRole,
  Paginated,
  UserSummary,
} from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { ClubAccessService } from './access/club-access.service.js';
import { UpdateClubDto } from '@app/contracts/club/dto/index.js';
import { User } from '@app/contracts/auth/index.js';
import { rpc } from '@app/common/helpers/rpc.helper.js';
import {
  AUTH_PATTERNS,
  NOTIFICATION_PATTERNS,
} from '@app/contracts/patterns.js';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE, NOTIFICATION_SERVICE } from '@app/contracts/queues.js';
import { NOTIFICATION_EVENTS } from '@app/contracts/events.js';
import { NotificationEventDto } from '@app/contracts/notification/dto/index.js';
import {
  NotificationCategory,
  NotificationType,
  SenderType,
} from '@app/contracts/notification/index.js';

@Injectable()
export class ClubServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubAccessService: ClubAccessService,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationClient: ClientProxy,
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
    const club = await this.clubAccessService.getClub(clubSlug);
    let coach: User | null = null;

    // get club coach full name
    const club_coach = await this.prisma.member.findFirst({
      where: { club_id: club.id, role: MemberRole.COACH },
    });

    if (club_coach) {
      coach = await rpc<User | null>(
        this.authClient,
        AUTH_PATTERNS.GET_USER_BY_ID,
        { user_id: club_coach.user_id },
      );
      if (!coach) {
        console.log(
          `[ClubService] User with id ${club_coach.user_id} not found for club with slug "${clubSlug}"`,
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
      coach_full_name: coach
        ? `${coach.first_name} ${coach.last_name}`
        : 'No Coach',
    };
  }

  async getClubStatus(
    club_slug: string,
    user_id: number,
  ): Promise<ClubMemberStatus> {
    const club = await this.clubAccessService.getClub(club_slug);
    const key = { club_id_user_id: { club_id: club.id, user_id } };
    const [member, request] = await Promise.all([
      this.prisma.member.findUnique({ where: key }),
      this.prisma.joinRequest.findUnique({
        where: key,
        select: { status: true },
      }),
    ]);

    const isMember = !!member && member.left_at === null; // a user who left is not a member
    return {
      is_member: isMember,
      member_id: isMember ? member.id : null,
      role: isMember ? member.role : null,
      has_pending_request:
        !isMember && request?.status === JoinRequestStatus.PENDING,
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

  // Insane Zmiralda
  // async getClubLeaderboard(
  //   clubSlug: string,
  //   user_id: number,
  //   page: number,
  //   limit: number,
  // ): Promise<Paginated<Leaderboard>> {
  //   const { club } = await this.clubAccessService.requireRole(
  //     clubSlug,
  //     user_id,
  //     MemberRole.MEMBER,
  //   );

  //   const [members, matches] = await Promise.all([
  //     // active members, so everyone appears, even with 0 points
  //     this.prisma.member.findMany({
  //       where: { club_id: club.id, left_at: null },
  //       select: { id: true, user_id: true },
  //     }),
  //     // finished matches only
  //     this.prisma.match.findMany({
  //       where: { club_id: club.id, status: MatchStatus.FINISHED },
  //       select: {
  //         winner_id: true,
  //         team1_id: true,
  //         team2_id: true,
  //         team1_points: true,
  //         team2_points: true,
  //         team1: { select: { player1_id: true, player2_id: true } },
  //         team2: { select: { player1_id: true, player2_id: true } },
  //       },
  //     }),
  //   ]);

  //   // points, wins and losses per member id
  //   const stats = new Map<
  //     number,
  //     { points: number; wins: number; losses: number }
  //   >();
  //   const add = (memberId: number | null, points: number, won: boolean) => {
  //     if (memberId === null) return; // singles: no player 2
  //     const s = stats.get(memberId) ?? { points: 0, wins: 0, losses: 0 };
  //     s.points += points;
  //     if (won) s.wins++;
  //     else s.losses++;
  //     stats.set(memberId, s);
  //   };

  //   for (const m of matches) {
  //     for (const id of [m.team1.player1_id, m.team1.player2_id])
  //       add(id, m.team1_points, m.winner_id === m.team1_id);
  //     for (const id of [m.team2.player1_id, m.team2.player2_id])
  //       add(id, m.team2_points, m.winner_id === m.team2_id);
  //   }

  //   // order: points, then wins, then the older member first
  //   const ranked = members
  //     .map((m) => ({
  //       ...m,
  //       ...(stats.get(m.id) ?? { points: 0, wins: 0, losses: 0 }),
  //     }))
  //     .sort((a, b) => b.points - a.points || b.wins - a.wins || a.id - b.id);

  //   const pageRows = ranked.slice((page - 1) * limit, page * limit);

  //   const users = await rpc<User[]>(
  //     this.authClient,
  //     AUTH_PATTERNS.GET_USERS_BY_IDS,
  //     {
  //       user_ids: pageRows.map((r) => r.user_id),
  //     },
  //   );
  //   const userById = new Map(users.map((u) => [u.id, u]));

  //   return {
  //     data: pageRows.map((r, i) => ({
  //       rank: (page - 1) * limit + i + 1,
  //       player: { ...userById.get(r.user_id)!, member_id: r.id },
  //       points: r.points,
  //       wins: r.wins,
  //       losses: r.losses,
  //       total_matches: r.wins + r.losses,
  //       win_streak: 0, // TODO: calculate win streak
  //       best_win_streak: 0, // TODO: calculate best win streak
  //     })),
  //     page,
  //     limit,
  //     total: ranked.length,
  //   };
  // }

  async joinClub(
    club_slug: string,
    user_id: number,
  ): Promise<JoinClubResponse> {
    const club = await this.clubAccessService.getClub(club_slug);
    const member = await this.prisma.member.findUnique({
      where: { club_id_user_id: { club_id: club.id, user_id } },
    });
    if (member && member.left_at === null) {
      throw rpcError(409, 'You are already a member of this club', 'Conflict');
    }

    // 1. first time: create the row (a double click cannot create a second one)
    const created = await this.prisma.joinRequest.createMany({
      data: [{ club_id: club.id, user_id }],
      skipDuplicates: true,
    });
    let isNewRequest = created.count === 1;

    // 2. the row exists: reopen it only if it is NOT pending (a pending one keeps its place in the queue)
    if (!isNewRequest) {
      const reopened = await this.prisma.joinRequest.updateMany({
        where: {
          club_id: club.id,
          user_id,
          status: { not: JoinRequestStatus.PENDING },
        },
        data: {
          status: JoinRequestStatus.PENDING,
          requested_at: new Date(),
          decided_at: null,
          decided_by: null,
        },
      });
      isNewRequest = reopened.count === 1;
    }

    if (isNewRequest) {
      const leader_plus = await this.prisma.member.findMany({
        where: {
          club_id: club.id,
          role: { in: [MemberRole.LEADER, MemberRole.COACH] },
          left_at: null,
        },
        select: { user_id: true },
      });
      const leader_user_ids = leader_plus.map((m) => m.user_id);
      const notify_data = {
        event_id: `join_request_${club.id}_${user_id}_${Date.now()}`,
        sender_type: SenderType.USER, // system
        sender_id: user_id,
        category: NotificationCategory.USER, // club
        type: NotificationType.JOIN_REQUESTED, // join request
        club_id: club.id,
        receiver_user_ids: leader_user_ids,
      };
      // step 6: notify
      await rpc(
        this.notificationClient,
        NOTIFICATION_EVENTS.JOIN_REQUESTED,
        notify_data,
      );
    }

    return { status: 'pending' };
  }

  async cancelJoin(
    club_slug: string,
    user_id: number,
  ): Promise<{ success: true }> {
    const club = await this.clubAccessService.getClub(club_slug);
    const cancelled = await this.prisma.joinRequest.updateMany({
      where: { club_id: club.id, user_id, status: JoinRequestStatus.PENDING },
      data: { status: JoinRequestStatus.CANCELLED },
    });
    if (cancelled.count === 0) {
      throw rpcError(
        404,
        'You have no pending request for this club',
        'Not Found',
      );
    }
    return { success: true };
  }

  async getJoinRequests(
    club_slug: string,
    user_id: number,
    page: number,
    limit: number,
  ): Promise<Paginated<JoinRequestWithUser>> {
    const { club } = await this.clubAccessService.requireRole(
      club_slug,
      user_id,
      MemberRole.LEADER,
    );

    const where = { club_id: club.id, status: JoinRequestStatus.PENDING };
    const [requests, total] = await Promise.all([
      this.prisma.joinRequest.findMany({
        where,
        orderBy: [{ requested_at: 'asc' }, { id: 'asc' }], // oldest first, like a queue
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.joinRequest.count({ where }),
    ]);

    const users = requests.length
      ? await rpc<User[]>(this.authClient, AUTH_PATTERNS.GET_USERS_BY_IDS, {
          user_ids: requests.map((r) => r.user_id),
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    // only the summary fields: User also has email and phone, which a leader should not get here
    const toSummary = (u: User): UserSummary => ({
      id: u.id,
      login: u.login,
      first_name: u.first_name,
      last_name: u.last_name,
      avatar: u.avatar,
      department: u.department,
    });

    return {
      data: requests.map((r) => ({
        ...r,
        requested_at: r.requested_at.toISOString(),
        decided_at: r.decided_at?.toISOString() ?? null,
        user: toSummary(userById.get(r.user_id)!),
      })),
      page,
      limit,
      total,
    };
  }

  async rejectJoinRequest(
    club_slug: string,
    user_id: number,
    request_id: number,
  ): Promise<{ success: true }> {
    const { club, member } = await this.clubAccessService.requireRole(
      club_slug,
      user_id,
      MemberRole.LEADER,
    );

    // one atomic update: only a pending request of THIS club can be rejected
    const rejected = await this.prisma.joinRequest.updateMany({
      where: {
        id: request_id,
        club_id: club.id,
        status: JoinRequestStatus.PENDING,
      },
      data: {
        status: JoinRequestStatus.REJECTED,
        decided_at: new Date(),
        decided_by: member.id,
      },
    });

    if (rejected.count === 0) {
      // tell "does not exist here" (404) from "already handled" (409)
      const exists = await this.prisma.joinRequest.findFirst({
        where: { id: request_id, club_id: club.id },
        select: { id: true },
      });
      if (!exists) throw rpcError(404, 'Join request not found', 'Not Found');
      throw rpcError(409, 'This request was already handled', 'Conflict');
    }
    return { success: true };
  }
}
