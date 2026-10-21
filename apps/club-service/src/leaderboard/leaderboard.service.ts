import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class LeaderboardService {
    constructor(
    private readonly prisma: PrismaService,
  ) {}

    async updateLeaderboard(club_id: number, team1_id: number, team2_id: number, team1_score: number, team2_score: number, winner_id: number | null) {
        // Start a transaction to update the leaderboard for both teams
        const result = await this.prisma.$transaction(async (prisma) => {

            // Get the teams
            const team1 = await prisma.team.findUnique({
                where: { id: team1_id },
                include: { player1: true, player2: true },
            });
            const team2 = await prisma.team.findUnique({
                where: { id: team2_id },
                include: { player1: true, player2: true },
            });

            if (!team1 || !team2) {
                throw new Error('One or both teams not found');
            }

            // Update leaderboard for team 1 players
            await this.updateMemeberLeaderboard(club_id, team1.player1_id, team1_score, winner_id === team1.id);
            if (team1.player2_id) {
                await this.updateMemeberLeaderboard(club_id, team1.player2_id, team1_score, winner_id === team1.id);
            }

            // Update leaderboard for team 2 players
            await this.updateMemeberLeaderboard(club_id, team2.player1_id, team2_score, winner_id === team2.id);
            if (team2.player2_id) {
                await this.updateMemeberLeaderboard(club_id, team2.player2_id, team2_score, winner_id === team2.id);
            }
        })
    }

    async updateMemeberLeaderboard(club_id: number, member_id: number, points: number, isWinner: boolean) {
        const isWin = isWinner ? 1 : 0;
        const isLose = isWinner ? 0 : 1;

        const result = await this.prisma.leaderboard.upsert({
            where: { club_id_user_id: { club_id, user_id: member_id } },
            create: {
                club_id,
                user_id: member_id,
                points: points,
                wins: isWin,
                losses: isLose,
                total_matches: 1,
                win_streak: isWin,
                best_win_streak: isWin,
                updated_at: new Date(),
            },
            update: {
                points: { increment: points },
                wins: { increment: isWin },
                losses: { increment: isLose },
                total_matches: { increment: 1 },
                win_streak: isWinner ? { increment: 1 } : 0,
                updated_at: new Date(),
            }
        })

        // New Win Streak Youuuuupiii
        // We can check achievements here as well
        if (result.win_streak > result.best_win_streak) {
            await this.prisma.leaderboard.update({
                where : { club_id_user_id: { club_id, user_id: member_id } },
                data: {
                    best_win_streak: result.win_streak,
                }
            })
        }
        
    }

}
