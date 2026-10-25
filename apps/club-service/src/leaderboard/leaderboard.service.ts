import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AUTH_PATTERNS,
  AUTH_SERVICE,
  Leaderboard,
  MemberRole,
  Paginated,
  User,
} from '@app/contracts';
import { ClubAccessService } from '../access/club-access.service.js';
import { rpc } from '@app/common/helpers/rpc.helper.js';
import { ClientProxy } from '@nestjs/microservices';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class LeaderboardService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly prisma: PrismaService,
    private readonly clubAccessService: ClubAccessService,
  ) {}

  async updateLeaderboard(
    tx: Prisma.TransactionClient,
    club_id: number,
    team1_id: number,
    team2_id: number,
    team1_points: number,
    team2_points: number,
    winner_id: number | null,
  ) {
    const team1 = await tx.team.findUnique({
      where: { id: team1_id },
      include: { player1: true, player2: true },
    });

    const team2 = await tx.team.findUnique({
      where: { id: team2_id },
      include: { player1: true, player2: true },
    });

    if (!team1 || !team2)
      throw new Error('One or both teams not found');

    // --- TEAM 1 ---
    await this.updateMemeberLeaderboard(
      tx,
      club_id,
      team1.player1.user_id,
      team1.player1.id,
      team1_points,
      winner_id === team1.id,
    );

    if (team1.player2) {
      await this.updateMemeberLeaderboard(
        tx,
        club_id,
        team1.player2.user_id,
        team1.player2.id,
        team1_points,
        winner_id === team1.id,
      );
    }

    // --- TEAM 2 ---
    await this.updateMemeberLeaderboard(
      tx,
      club_id,
      team2.player1.user_id,
      team2.player1.id,
      team2_points,
      winner_id === team2.id,
    );

    if (team2.player2) {
      await this.updateMemeberLeaderboard(
        tx,
        club_id,
        team2.player2.user_id,
        team2.player2.id,
        team2_points,
        winner_id === team2.id,
      );
    }
  }

  async updateMemeberLeaderboard(
    tx: Prisma.TransactionClient,
    club_id: number,
    user_id: number,
    member_id: number,
    pointsChange: number,
    isWinner: boolean,
  ) {
    const isWin = isWinner ? 1 : 0;
    const isLose = isWinner ? 0 : 1;

    // 1. Fetch current record to calculate floor limits safely
    const existing = await tx.leaderboard.findUnique({
      where: { club_id_user_id_member_id: { club_id, user_id, member_id } },
    });

    // 2. Clamp total points so they never drop below zero
    const finalPoints = existing
      ? Math.max(0, existing.points + pointsChange)
      : Math.max(0, pointsChange);

    // 3. Pre-calculate the win streak to avoid a second update query
    const currentStreak = existing ? existing.win_streak : 0;
    const newStreak = isWinner ? currentStreak + 1 : 0;

    const currentBest = existing ? existing.best_win_streak : 0;
    const newBest = Math.max(currentBest, newStreak);

    // 4. Upsert using exact values
    await tx.leaderboard.upsert({
      where: { club_id_user_id_member_id: { club_id, user_id, member_id } },
      create: {
        club_id,
        user_id,
        member_id,
        points: finalPoints,
        wins: isWin,
        losses: isLose,
        total_matches: 1,
        win_streak: newStreak,
        best_win_streak: newBest,
        updated_at: new Date(),
      },
      update: {
        points: finalPoints,
        wins: { increment: isWin },
        losses: { increment: isLose },
        total_matches: { increment: 1 },
        win_streak: newStreak,
        best_win_streak: newBest,
        updated_at: new Date(),
      },
    });
  }

  async getClubLeaderboard(
    clubSlug: string,
    user_id: number,
    page: number,
    limit: number,
  ): Promise<Paginated<Leaderboard>> {
    // Check if the user has access to the club and get the club details
    const { club } = await this.clubAccessService.requireRole(
      clubSlug,
      user_id,
      MemberRole.MEMBER,
    );
    // Calculate the number of rows to skip based on the page and limit
    const rowsToSkip = (page - 1) * limit;
    // Start a transaction to fetch the leaderboard rows and count the total rows for pagination
    const [rows, total] = await this.prisma.$transaction([
      // Fetch leaderboard rows for the club with pagination and sorting
      this.prisma.leaderboard.findMany({
        where: { club_id: club.id },
        orderBy: [
          { points: 'desc' },
          { wins: 'desc' },
          { losses: 'asc' },
          { total_matches: 'desc' },
          { member_id: 'asc' },
        ],
        skip: rowsToSkip,
        take: limit,
        select: {
          user_id: true,
          member_id: true,
          points: true,
          wins: true,
          losses: true,
          total_matches: true,
          win_streak: true,
          best_win_streak: true,
        },
      }),

      // Count total rows for pagination
      this.prisma.leaderboard.count({
        where: { club_id: club.id },
      }),
    ]);

    // If no rows are found, return an empty paginated response
    if (rows.length === 0) {
      return { data: [], page, limit, total };
    }

    // Safe guard: Unique user ids
    const uniqueUserIds = Array.from(new Set(rows.map((row) => row.user_id)));
    // Fetch user details from Auth Service
    const users = await rpc<User[]>(
      this.authClient,
      AUTH_PATTERNS.GET_USERS_BY_IDS,
      { user_ids: uniqueUserIds },
    );
    // Map user ids to user details for fast, easy lookup
    const userByIdMap = new Map(users.map((user) => [user.id, user]));

    // Map leaderboard rows to include user details
    const data = rows.map((row, index) => {
      const user = userByIdMap.get(row.user_id);
      return {
        rank: rowsToSkip + index + 1,
        points: row.points,
        wins: row.wins,
        losses: row.losses,
        total_matches: row.total_matches,
        win_streak: row.win_streak,
        best_win_streak: row.best_win_streak,
        player: user
          ? { ...user, member_id: row.member_id }
          : {
              id: row.user_id,
              login: 'Unknown Player',
              first_name: 'Unknown',
              last_name: 'Unknown',
              avatar: null,
              department: null,
              member_id: row.member_id,
            },
      };
    });

    return {
      data: data,
      page,
      limit,
      total,
    };
  }
}
