import {
  CreateSessionBody,
  SessionView,
  UpdateSessionBody,
  WeekView,
} from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubAccessService } from '../access/club-access.service.js';
import {
  weekRange,
  today,
  toDate,
  addDays,
  mondayOf,
  now,
} from '@app/common/dates.js';
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

  async createSession(
    clubSlug: string,
    userId: number,
    body: CreateSessionBody,
  ): Promise<WeekView> {
    const { club } = await this.clubAccessService.requireRole(
      clubSlug,
      userId,
      1, // LEADER or COACH
    ); // here we chack that is member and have role >= 1

    const {
      weekday,
      start_time,
      end_time,
      title,
      location,
      capacity,
      repeat_weekly,
      week_start,
    } = body;

    const monday = mondayOf(week_start ?? today());

    // check if the session is far then 2 weeks from now, if yes, throw error
    const twoWeeksFromNow = addDays(today(), 14);
    if (monday > twoWeeksFromNow) {
      throw rpcError(
        400,
        'Cannot create a session more than 2 weeks in advance',
        'Bad Request',
      );
    }

    // check if the session is in the past, if yes, throw error
    const sessionStart = toDate(addDays(monday, weekday), start_time);
    const sessionEnd = toDate(addDays(monday, weekday), end_time);
    if (sessionStart < toDate(today())) {
      throw rpcError(400, 'Cannot create a session in the past', 'Bad Request');
    }

    // check if exact same solot already exists for this club, if yes, throw error
    const existingSession = await this.prisma.session.findFirst({
      where: {
        club_id: club.id,
        start_at: sessionStart,
        end_at: sessionEnd,
        location: location ?? null,
        title: title ?? null,
      },
    });

    if (existingSession) {
      throw rpcError(
        400,
        'A session with the same time, location, and title already exists for this club',
        'Bad Request',
      );
    }

    await this.prisma.session.create({
      data: {
        club_id: club.id,
        template_id: null, // Assuming no template for now
        start_at: sessionStart,
        end_at: sessionEnd,
        title: title ?? null,
        location: location ?? null,
        capacity,
        cancelled_at: null,
      },
    });

    // take full date to calculate duration in minutes, because we need to know if the session is crossing midnight or not
    const durationMinutes =
      (sessionEnd.getTime() - sessionStart.getTime()) / 60000;
    // add session to template
    // add to this week based on monday and next week if next week
    if (repeat_weekly) {
      await this.prisma.sessionTemplate.create({
        data: {
          club_id: club.id,
          weekday,
          start_time,
          duration_minutes: durationMinutes,
          title: title ?? null,
          location: location ?? null,
          capacity,
        },
      });
    }

    return this.getClubWeekSessions(clubSlug, monday);
  }

  async updateSession(
    clubSlug: string,
    sessionId: string,
    userId: number,
    body: UpdateSessionBody,
  ): Promise<WeekView> {
    const { club } = await this.clubAccessService.requireRole(
      clubSlug,
      userId,
      1, // LEADER or COACH
    );

    const session = await this.prisma.session.findUnique({
      where: {
        id: parseInt(sessionId, 10),
      },
    });

    if (!session || session.club_id !== club.id) {
      throw rpcError(404, 'Session not found', 'Not Found');
    }

    // Update the session with the provided fields
    const updatedSession = await this.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        start_at: body.start_time
          ? toDate(
              session.start_at.toISOString().split('T')[0],
              body.start_time,
            )
          : undefined,
        end_at: body.end_time
          ? toDate(session.end_at.toISOString().split('T')[0], body.end_time)
          : undefined,
        title: body.title ?? undefined,
        location: body.location ?? undefined,
        capacity: body.capacity ?? undefined,
        updated_at: now(),
      },
    });

    // If apply_to_future is true and a template_id is provided, update future sessions
    if (body.apply_to_future && body.template_id) {
      const templateId = parseInt(body.template_id, 10);
      await this.prisma.session.updateMany({
        where: {
          template_id: templateId,
          start_at: {
            gt: updatedSession.start_at,
          },
        },
        data: {
          start_at: body.start_time
            ? toDate(
                updatedSession.start_at.toISOString().split('T')[0],
                body.start_time,
              )
            : undefined,
          end_at: body.end_time
            ? toDate(
                updatedSession.end_at.toISOString().split('T')[0],
                body.end_time,
              )
            : undefined,
          title: body.title ?? undefined,
          location: body.location ?? undefined,
          capacity: body.capacity ?? undefined,
          updated_at: now(),
        },
      });
      // apply changes to the template if template_id is provided
      const durationMinutes =
        (updatedSession.end_at.getTime() - updatedSession.start_at.getTime()) /
        60000;
      await this.prisma.sessionTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          start_time: body.start_time ?? undefined,
          duration_minutes:
            body.start_time && body.end_time ? durationMinutes : undefined,
          title: body.title ?? undefined,
          location: body.location ?? undefined,
          capacity: body.capacity ?? undefined,
          updated_at: now(),
        },
      });
    }

    return this.getClubWeekSessions(
      clubSlug,
      mondayOf(updatedSession.start_at.toISOString().split('T')[0]),
    );
  }

  async deleteSession(
    clubSlug: string,
    sessionId: string,
    userId: number,
    applyToFuture: boolean,
  ): Promise<WeekView> {
    const { club } = await this.clubAccessService.requireRole(
      clubSlug,
      userId,
      1, // LEADER or COACH
    );

    const session = await this.prisma.session.findUnique({
      where: {
        id: parseInt(sessionId, 10),
      },
    });

    if (!session || session.club_id !== club.id) {
      throw rpcError(404, 'Session not found', 'Not Found');
    }

    // Delete the session
    await this.prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    // If apply_to_future is true and a template_id is provided, delete future sessions
    if (applyToFuture && session.template_id) {
      const templateId = session.template_id;
      await this.prisma.session.deleteMany({
        where: {
          template_id: templateId,
          start_at: {
            gt: session.start_at,
          },
        },
      });
      // delete the template if template_id is provided
      await this.prisma.sessionTemplate.delete({
        where: {
          id: templateId,
        },
      });
    }

    return this.getClubWeekSessions(
      clubSlug,
      mondayOf(session.start_at.toISOString().split('T')[0]),
    );
  }
}
