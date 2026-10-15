import { SessionView, WeekView } from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubAccessService } from '../access/club-access.service.js';
import { weekRange, today, toDate, addDays } from '@app/common/dates.js';
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
    const { member, club } = await this.clubAccessService.requireRole(
      clubSlug,
      1,
      0,
    ); // user_id = 1, minRole = MEMBER (0)

    const { weekStart, from, to } = weekRange(weekStartDate);

    // Fetch sessions for the specified week
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

    // get is joined for each session for the current user
    // we need just session id so we select only session id 
    const sessionAttends = await this.prisma.sessionAttend.findMany({
      where: {
        member_id: member.id,
        session_id: {
          in: sessions.map((s) => s.id),
        },
      },
      select: {
        session_id: true,
      },
    });

    // create a set of session ids that the user has joined,
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

    return {
      week_start: weekStart,
      is_current_week: isCurrentWeek,
      prev_week_start: addDays(weekStart, -7),
      next_week_start: addDays(weekStart, 7),
      sessions: sessionViews,
    };
  }

  async attendSession(clubSlug: string, sessionId: string, userId: number) {
    const { member, club } = await this.clubAccessService.requireRole(
      clubSlug,
      userId,
      0,
    );

    // Check if the session exists and belongs to the club
    const session = await this.prisma.session.findUnique({
      where: {
        id: parseInt(sessionId, 10),
      },
    });

    if (!session || session.club_id !== club.id) {
      throw rpcError(404, 'Session not found', 'Not Found');
    }

    // Check if the user is already attending the session
    const existingAttend = await this.prisma.sessionAttend.findUnique({
      where: {
        session_id_member_id: {
          member_id: member.id,
          session_id: session.id,
        },
      },
    });

    if (existingAttend) {
      throw rpcError(
        400,
        'User is already attending this session',
        'Bad Request',
      );
    }

    // Check if the session has available spots
    const attendsCount = await this.prisma.sessionAttend.count({
      where: {
        session_id: session.id,
      },
    });

    if (attendsCount >= session.capacity) {
      throw rpcError(400, 'Session is full', 'Bad Request');
    }

    // Create a new session attend record
    await this.prisma.sessionAttend.create({
      data: {
        member_id: member.id,
        session_id: session.id,
      },
    });
  }

  async unattendSession(clubSlug: string, sessionId: string, userId: number) {
    const { member, club } = await this.clubAccessService.requireRole(
      clubSlug,
      userId,
      0,
    );

    // Check if the session exists and belongs to the club
    const session = await this.prisma.session.findUnique({
      where: {
        id: parseInt(sessionId, 10),
      },
    });

    if (!session || session.club_id !== club.id) {
      throw rpcError(404, 'Session not found', 'Not Found');
    }

    // Check if the user is attending the session
    const existingAttend = await this.prisma.sessionAttend.findUnique({
      where: {
        session_id_member_id: {
          member_id: member.id,
          session_id: session.id,
        },
      },
    });

    if (!existingAttend) {
      throw rpcError(400, 'User is not attending this session', 'Bad Request');
    }

    // Delete the session attend record
    await this.prisma.sessionAttend.delete({
      where: {
        session_id_member_id: {
          member_id: member.id,
          session_id: session.id,
        },
      },
    });
  }
}
