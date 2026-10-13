import { SessionView, WeekView } from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubAccessService } from '../access/club-access.service.js';
import { todayInAppTz } from '@app/common/dates.js';

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
    const club = await this.clubAccessService.getClub(clubSlug);
    if (!club) {
      console.log(`[SessionsService] Club with slug "${clubSlug}" not found`);
      throw rpcError(404, 'Club not found', 'Not Found');
    }

    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const sessions = await this.prisma.session.findMany({
      where: {
        club_id: club.id,
        start_at: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: {
        start_at: 'asc',
      },
    });

    const sessionViews: SessionView[] = sessions.map((session) => ({
      id: session.id,
      club_id: session.club_id,
      template_id: session.template_id,
      start_at: session.start_at.toISOString(),
      end_at: session.end_at.toISOString(),
      title: session.title,
      location: session.location,
      capacity: session.capacity,
      cancelled_at: session.cancelled_at?.toISOString() ?? null,
      created_at: session.created_at.toISOString(),
      updated_at: session.updated_at.toISOString(),
      attends_count: 0,
      spots_left: session.capacity,
      is_joined: false,
      state: 'open',
    }));

    const today = todayInAppTz();
    const isCurrentWeek = weekStart <= today && today < weekEnd;

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    return {
      week_start: weekStart.toISOString().split('T')[0],
      is_current_week: isCurrentWeek,
      prev_week_start: prevWeekStart.toISOString(),
      next_week_start: nextWeekStart.toISOString(),
      sessions: sessionViews,
    };
  }
}
