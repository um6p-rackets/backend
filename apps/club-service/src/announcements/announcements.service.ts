import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_PATTERNS, AUTH_SERVICE, rpcError, User } from '@app/contracts';
import { ClubAccessService } from '../access/club-access.service.js';
import {
  AnnouncementWithAuthor,
  MemberRole,
  Paginated,
} from '@app/contracts/club/club.types.js';
import { rpc, toFullString } from '@app/common';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly clubAccessService: ClubAccessService,
  ) {}

  async getClubAnnouncements({
    slug,
    user_id,
    page,
    limit,
  }: {
    slug: string;
    user_id: number;
    page: number;
    limit: number;
  }): Promise<Paginated<AnnouncementWithAuthor>> {
    const { club } = await this.clubAccessService.requireRole(
      slug,
      user_id,
      MemberRole.MEMBER,
    );

    const where = { club_id: club.id };

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const members = await this.prisma.member.findMany({
      where: {
        club_id: club.id,
        id: { in: [...new Set(announcements.map((a) => a.announcer_id))] },
      },
    });

    const users = await rpc<User[]>(
      this.authClient,
      AUTH_PATTERNS.GET_USERS_BY_IDS,
      {
        user_ids: members.map((m) => m.user_id),
      },
    );

    const memberById = new Map(members.map((m) => [m.id, m]));
    const userById = new Map(users.map((u) => [u.id, u]));

    const data = announcements.map((announcement) => {
      const member = memberById.get(announcement.announcer_id);
      const user = member && userById.get(member.user_id);

      if (!member)
        throw rpcError(
          500,
          'Announcer member info not found',
          'Internal Server Error',
        );
      if (!user)
        throw rpcError(
          500,
          'Announcer user info not found',
          'Internal Server Error',
        );

      return {
        ...announcement,
        created_at: toFullString(announcement.created_at),
        announcer: {
          id: user.id,
          login: user.login,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar ?? null,
          department: user.department ?? null,
          member_id: member.id,
        },
      };
    });

    return { data, page, limit, total };
  }

  async createAnnouncement({
    slug,
    user_id,
    description,
  }: {
    slug: string;
    user_id: number;
    description: string;
  }): Promise<AnnouncementWithAuthor> {
    const { club, member } = await this.clubAccessService.requireRole(
      slug,
      user_id,
      MemberRole.LEADER,
    );

    const announcement = await this.prisma.announcement.create({
      data: {
        club_id: club.id,
        announcer_id: member.id,
        description,
      },
    });

    const announcerUser = await rpc<User>(
      this.authClient,
      AUTH_PATTERNS.GET_USER_BY_ID,
      { user_id: member.user_id },
    );

    return {
      ...announcement,
      created_at: toFullString(announcement.created_at),
      announcer: {
        id: announcerUser.id,
        login: announcerUser.login,
        first_name: announcerUser.first_name,
        last_name: announcerUser.last_name,
        avatar: announcerUser.avatar ?? null,
        department: announcerUser.department ?? null,
        member_id: member.id,
      },
    };
  }

  async deleteAnnouncement({
    slug,
    user_id,
    announcement_id,
  }: {
    slug: string;
    user_id: number;
    announcement_id: number;
  }): Promise<{ status: number; message: string }> {
    const { club } = await this.clubAccessService.requireRole(
      slug,
      user_id,
      MemberRole.LEADER,
    );

    const announcement = await this.prisma.announcement.findUnique({
      where: {
        id: announcement_id,
      },
    });

    if (!announcement || announcement.club_id !== club.id) {
      throw rpcError(
        404,
        'Announcement not found or does not belong to the club',
        'Not Found',
      );
    }

    await this.prisma.announcement.delete({
      where: {
        id: announcement_id,
      },
    });

    return {
      status: 200,
      message: 'Announcement deleted successfully',
    };
  }
}
