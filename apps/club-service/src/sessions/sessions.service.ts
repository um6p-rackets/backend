import { SessionView, WeekView } from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubAccessService } from '../access/club-access.service.js';
import { weekRange, today, toDate } from '@app/common/dates.js';
import { sessionState } from './sessions-status.server.js';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubAccessService: ClubAccessService,
  ) {}

  async getClubWeekSessions(
    clubSlug: string,
    weekStartDate: string,
  ): Promise<WeekView> {
    console.log(
      `[SessionsService] Fetching sessions for club with slug: ${clubSlug} and week start date: ${weekStartDate}`,
    );
    const {member, club} = await this.clubAccessService.requireRole(clubSlug, 1, 0); // user_id = 1, minRole = MEMBER (0)
    if (!club) {
      console.log(`[SessionsService] Club with slug "${clubSlug}" not found`);
      throw rpcError(404, 'Club not found', 'Not Found');
    }

    const { weekStart, from, to } = weekRange(weekStartDate);

    const sessions = await this.prisma.session.findMany({
      where: {
        club_id: club.id,
        start_at: {
          gte: from,
          lt: to,
        },
      },
      orderBy: {
        start_at: 'asc',
      },
    });

    // Fetch the attends count for each session in a single query
    const attendsCounts = await this.prisma.sessionAttend.groupBy({
      by: ['session_id'],
      where: {
        session_id: {
          in: sessions.map((s) => s.id),
        },
      },
      _count: {
        session_id: true,
      },
    });

    const attendsCountMap = new Map(
      attendsCounts.map((ac) => [ac.session_id, ac._count.session_id]),
    );

    // get is joined for each session for the current user (user_id = 1)
    // first check if user is member of the club
      let sessionAttends: any[] = [];
    if (member) {
      sessionAttends = await this.prisma.sessionAttend.findMany({
        where: {
          member_id: member.id,
          session_id: {
            in: sessions.map((s) => s.id),
          },
        },
      });
    }

    const joinedSessionIds = new Set(sessionAttends.map((sa) => sa.session_id));

    const sessionViews: SessionView[] = sessions.map((session) => {
      const attendsCount = attendsCountMap.get(session.id) ?? 0;

      return {
        ...session,
        start_at: session.start_at.toISOString(),
        end_at: session.end_at.toISOString(),
        cancelled_at: session.cancelled_at?.toISOString() ?? null,
        created_at: session.created_at.toISOString(),
        updated_at: session.updated_at.toISOString(),
        attends_count: attendsCount,
        spots_left: Math.max(0, session.capacity - attendsCount),
        is_joined: joinedSessionIds.has(session.id), // Placeholder for current user check
        state: sessionState(session, 0),
      };
    });

    const to_day = today();

    const isCurrentWeek = weekStart <= to_day && toDate(to_day) < to;

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    return {
      week_start: weekStart,
      is_current_week: isCurrentWeek,
      prev_week_start: prevWeekStart.toISOString(),
      next_week_start: nextWeekStart.toISOString(),
      sessions: sessionViews,
    };
  }
}
