import {
  Club,
  ClubMemberStatus,
  ClubWithMembersCountAndCoachFullName,
  JoinClubResponse,
  JoinedClub,
  JoinRequestStatus,
  JoinRequestWithUser,
  Leaderboard,
  MatchStatus,
  MemberRole,
  Paginated,
  UserClubRank,
  UserGlobalStat,
  UserProfileData,
  UserSummary,
} from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { ClubAccessService } from './access/club-access.service.js';
import { UpdateClubDto } from '@app/contracts/club/dto/index.js';
import { User } from '@app/contracts/auth/index.js';
import { emitEvent, rpc } from '@app/common/helpers/rpc.helper.js';
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
import { toFullString } from '@app/common/dates.js';
import { MatchesService } from './matches/matches.service.js';
import { AchievementsService } from './achievements/achievements.service.js';

@Injectable()
export class ClubServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubAccessService: ClubAccessService,
    private readonly achievementsService: AchievementsService,
		private readonly matchesService: MatchesService,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationClient: ClientProxy,
  ) {}

  // =========================== User Profile Data ===========================
  async getUserProfile(user_id: number): Promise<UserProfileData> {
    const userJoinedClubs = await this.getJoinedClubs(user_id);
    const userAchievements =
      await this.achievementsService.getUserAchievements(user_id);
    const userClubsId = userJoinedClubs.map((joinedClub) => joinedClub.club.id);
    // Fetch the first 10 matches for the user across all joined clubs
    const userMatches = await this.matchesService.getUserMatches(
      user_id,
      userClubsId,
      1,
      10,
      true, // if [True]: get all matches, if [False]: only limit to 10 matches
    );
    const userClubRanks = await this.UserClubRank(user_id);
    const userGlobalStats = await this.getUserGlobalStats(user_id);

    return {
      joined_clubs: userJoinedClubs,
      achievements: userAchievements,
      history: userMatches,
      club_ranks: userClubRanks,
      global_stats: userGlobalStats,
    };
  }

  async getJoinedClubs(user_id: number): Promise<JoinedClub[]> {
    const memberClubs = await this.prisma.member.findMany({
      where: { user_id, left_at: null },
      select: {
        // Club Info
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatar: true,
            created_at: true,
          },
        },
        // Member info in this Club
        id: true,
        role: true,
        joined_at: true,
      },
    });
    return memberClubs.map((mc: (typeof memberClubs)[0]) => ({
      club: {
        ...mc.club,
        created_at: toFullString(mc.club.created_at),
      },
      member_id: mc.id,
      role: mc.role,
      joined_at: toFullString(mc.joined_at),
    }));
  }

  async UserClubRank(user_id: number): Promise<UserClubRank[]> {
    // Fetch all leaderboard rows for this user (including tie-breaker fields)
    const userRows = await this.prisma.leaderboard.findMany({
      where: { user_id },
      select: {
        club_id: true,
        points: true,
        wins: true,
        losses: true,
        total_matches: true,
        member_id: true,
        club: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
    // Calculate the exact rank for each club
    const userClubRanks: UserClubRank[] = await Promise.all(
      userRows.map(async (row) => {
        const higherRankedCount = await this.prisma.leaderboard.count({
          where: {
            club_id: row.club_id,
            OR: [
              // Tie-breaker rules perfectly matching @@index in prisma schema
              { points: { gt: row.points } },
              { points: row.points, wins: { gt: row.wins } },
              {
                points: row.points,
                wins: row.wins,
                losses: { lt: row.losses },
              },
              {
                points: row.points,
                wins: row.wins,
                losses: row.losses,
                total_matches: { gt: row.total_matches },
              },
              {
                points: row.points,
                wins: row.wins,
                losses: row.losses,
                total_matches: row.total_matches,
                member_id: { lt: row.member_id },
              },
            ],
          },
        });

        return {
          club_id: row.club_id,
          club_name: row.club.name,
          club_slug: row.club.slug,
          points: row.points,
          rank: higherRankedCount + 1, // if no one above you, rank is 1
        };
      }),
    );

    return userClubRanks;
  }

  async getUserGlobalStats(user_id: number): Promise<UserGlobalStat> {
    const [stats, bestClubProfile] = await Promise.all([
      // Query 1: Calculate sums and the highest current win streak in one pass
      this.prisma.leaderboard.aggregate({
        where: { user_id },
        _sum: {
          points: true,
          wins: true,
          losses: true,
        },
        _max: {
          win_streak: true,
        },
      }),

      // Query 2: Find the club where the user performs the best
      this.prisma.leaderboard.findFirst({
        where: { user_id },
        orderBy: [
          { points: 'desc' },
          { wins: 'desc' },
          { losses: 'asc' },
          { total_matches: 'desc' },
          { member_id: 'asc' },
        ],
        include: {
          club: { select: { name: true, slug: true } },
        },
      }),
    ]);

    let best_rank = null;
    if (bestClubProfile) {
      const higherRankedCount = await this.prisma.leaderboard.count({
        where: {
          club_id: bestClubProfile.club_id,
          OR: [
            // 1. More points
            { points: { gt: bestClubProfile.points } },
            // 2. Tied points, but more wins
            {
              points: bestClubProfile.points,
              wins: { gt: bestClubProfile.wins },
            },
            // 3. Tied points & wins, but fewer losses
            {
              points: bestClubProfile.points,
              wins: bestClubProfile.wins,
              losses: { lt: bestClubProfile.losses },
            },
            // 4. Tied points, wins, & losses, but more total matches
            {
              points: bestClubProfile.points,
              wins: bestClubProfile.wins,
              losses: bestClubProfile.losses,
              total_matches: { gt: bestClubProfile.total_matches },
            },
            // 5. Absolute tie, but joined earlier (lower member_id)
            {
              points: bestClubProfile.points,
              wins: bestClubProfile.wins,
              losses: bestClubProfile.losses,
              total_matches: bestClubProfile.total_matches,
              member_id: { lt: bestClubProfile.member_id },
            },
          ],
        },
      });

      best_rank = {
        club_id: bestClubProfile.club_id,
        club_name: bestClubProfile.club.name,
        club_slug: bestClubProfile.club.slug,
        rank: higherRankedCount + 1, // Rank is 1-based
        points: bestClubProfile.points,
      };
    }

    const wins = stats._sum.wins ?? 0;
    const losses = stats._sum.losses ?? 0;
    const points = stats._sum.points ?? 0;
    const total_matches = wins + losses;
    const highest_win_streak = stats._max.win_streak ?? 0;
    const win_rate = total_matches > 0 ? wins / total_matches : 0;

    return {
      total_matches,
      wins,
      losses,
      win_rate,
      ladder_points: points,
      current_win_streak: highest_win_streak,
      best_rank: best_rank,
    };
  }
  // ==========================================================================

  async getAllClubs(): Promise<Club[]> {
    const result = await this.prisma.club.findMany({
      orderBy: { name: 'asc' },
    });
    return result.map((club) => ({
      ...club,
      created_at: toFullString(club.created_at),
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
      created_at: toFullString(club.created_at),
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

    // slug never updated, but if name is updated
    // let slug = club.slug;
    body.name = body.name?.trim();
    body.description = body.description?.trim();
    if (!body.name && !body.description) {
      throw rpcError(
        400,
        'At least one of name or description must be provided',
        'Bad Request',
      );
    }

    // if (body.name) {
    //   slug = body.name.toLowerCase().replace(/\s+/g, '-'); // Generate slug from name if provided
    // }

    // Check if the new slug already exists for another club
    // if (slug !== club.slug) {
    //   const existingClub = await this.prisma.club.findUnique({
    //     where: { slug },
    //   });
    //   if (existingClub) {
    //     throw rpcError(400, 'Club name already exists', 'Bad Request');
    //   }
    // }

    const updatedClub = await this.prisma.club.update({
      where: { id: club.id },
      data: {
        name: body.name ?? club.name,
        description: body.description ?? club.description,
        // slug,
      },
    });
    // reeeeespect, poooooooower, baNaNa, hihihi it funny, don't ask me why this comment is here, I just wanted to have some fun while coding
    return {
      ...updatedClub,
      created_at: toFullString(updatedClub.created_at),
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
      const [leaders, user] = await Promise.all([
        this.prisma.member.findMany({
          where: {
            club_id: club.id,
            role: { in: [MemberRole.LEADER, MemberRole.COACH] },
            left_at: null,
          },
          select: { user_id: true },
        }),
        rpc<User | null>(
          this.authClient,
          AUTH_PATTERNS.GET_USER_BY_ID,
          { user_id },
        ),
      ]); 

      const notify_data: NotificationEventDto = {
        event_id: `${NOTIFICATION_EVENTS.JOIN_REQUESTED}:${club.id}:${user_id}`,
        sender_type: SenderType.USER,
        sender_id: String(user_id),
        sender_name: user ? `${user.first_name} ${user.last_name}`: null,
        sender_avatar_url: user?.avatar ?? null,
        category: NotificationCategory.CLUB,
        type: NotificationType.JOIN_REQUESTED,
        club_id: String(club.id),
        club_name: club.name,
        sent_at: new Date(),
        receiver_user_ids: leaders.map((m) => String(m.user_id)),
      };

      await emitEvent(
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

      const request = await this.prisma.joinRequest.findFirst({
        where: {
          id: request_id,
          club_id: club.id,
          status: JoinRequestStatus.PENDING,
        },
        select: {
          id: true,
          user_id: true,
        },
      });

      if (!request) {
        const exists = await this.prisma.joinRequest.findFirst({
          where: { id: request_id, club_id: club.id },
          select: { id: true },
        });

        if (!exists) {
          throw rpcError(404, 'Join request not found', 'Not Found');
        }

        throw rpcError(409, 'This request was already handled', 'Conflict');
      }

      const rejected = await this.prisma.joinRequest.updateMany({
        where: {
          id: request.id,
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
        throw rpcError(409, 'This request was already handled', 'Conflict');
      }

      const leader = await rpc<User>(
        this.authClient,
        AUTH_PATTERNS.GET_USER_BY_ID,
        { user_id: member.user_id },
      );

      const notify_data: NotificationEventDto = {
        event_id: `${NOTIFICATION_EVENTS.JOIN_REJECTED}:${club.id}:${request.id}`,
        sender_type: SenderType.USER,
        sender_id: String(member.user_id),
        sender_name: `${leader.first_name} ${leader.last_name}`,
        sender_avatar_url: leader.avatar ?? null,
        category: NotificationCategory.CLUB,
        type: NotificationType.JOIN_REJECTED,
        club_id: String(club.id),
        club_name: club.name,
        sent_at: new Date(),
        receiver_user_ids: [String(request.user_id)],
      };

      await emitEvent(
        this.notificationClient,
        NOTIFICATION_EVENTS.JOIN_REJECTED,
        notify_data,
      );

      return { success: true };
    }
  // async rejectJoinRequest(
  //   club_slug: string,
  //   user_id: number,
  //   request_id: number,
  // ): Promise<{ success: true }> {
  //   const { club, member } = await this.clubAccessService.requireRole(
  //     club_slug,
  //     user_id,
  //     MemberRole.LEADER,
  //   );

  //   // one atomic update: only a pending request of THIS club can be rejected
  //   const rejected = await this.prisma.joinRequest.updateMany({
  //     where: {
  //       id: request_id,
  //       club_id: club.id,
  //       status: JoinRequestStatus.PENDING,
  //     },
  //     data: {
  //       status: JoinRequestStatus.REJECTED,
  //       decided_at: new Date(),
  //       decided_by: member.id,
  //     },
  //   });

  //   if (rejected.count === 0) {
  //     const exists = await this.prisma.joinRequest.findFirst({
  //       where: { id: request_id, club_id: club.id },
  //       select: { id: true },
  //     });
  //     if (!exists) throw rpcError(404, 'Join request not found', 'Not Found');
  //     throw rpcError(409, 'This request was already handled', 'Conflict');
  //   }
  //   return { success: true };
  // }

  async leaveClub(
    club_slug: string,
    user_id: number,
  ): Promise<{ success: boolean; message: string }> {
    const { club, member } = await this.clubAccessService.requireRole(
      club_slug,
      user_id,
      MemberRole.MEMBER,
    );

    // Prevent the last  coach from leaving the club
    if (member.role === MemberRole.COACH) {
      const leadersAndCoachesCount = await this.prisma.member.count({
        where: {
          club_id: club.id,
          role: MemberRole.COACH,
          left_at: null,
        },
      });

      if (leadersAndCoachesCount <= 1) {
        throw rpcError(
          400,
          ":'< You are the only coach we have, sorry i can't let you leave.",
          'Bad Request',
        );
      }
    }

    // one atomic update: only a member of THIS club can leave
    const left = await this.prisma.member.updateMany({
      where: {
        id: member.id,
        club_id: club.id,
        left_at: null, // only active members can leave
      },
      data: {
        left_at: new Date(),
      },
    });

    if (left.count === 0) {
      throw rpcError(404, 'You are not a member of this club', 'Not Found');
    }
    return { success: true, message: 'You have successfully left the club.' };
  }
}
