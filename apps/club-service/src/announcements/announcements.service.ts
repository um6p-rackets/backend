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
    const announcements = await this.prisma.announcement.findMany({
      where: {
        club_id: club.id,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.announcement.count({
      where: {
        club_id: club.id,
      },
    });

    const announerMemberIds = announcements.map((a) => a.announcer_id);

    const announcerMembersInfo = await this.prisma.member.findMany({
      where: {
        club_id: club.id,
        user_id: {
          in: announerMemberIds,
        },
      },
    });
    
    const announcerUserIds = announcerMembersInfo.map((m) => m.user_id);
    const announcerUsers = await rpc<User[]>(this.authClient, AUTH_PATTERNS.GET_USERS_BY_IDS, announcerUserIds);


//  type AnnouncementWithAuthor = {
//  id: number;
//  club_id: number;
//  announcer_id: number;
//  description: string;
//  created_at: string;
//  announcer: {
//  id: number;
//  login: string;
//  first_name: string;
//  last_name: string;
//  avatar: string | null;
//  department: string | null;
//  member_id: number;
//  };
// }

    // map on announcements, and for each announcement, find the announcer member info and user info, and combine them into AnnouncementWithAuthor
    const announcementsWithAuthor: AnnouncementWithAuthor[] = announcements.map(
      (announcement) => {
        const announcerMemberInfo = announcerMembersInfo.find(
          (m) => m.id === announcement.announcer_id );
        const announcerUserInfo = announcerUsers.find(
          (u) => u.id === announcerMemberInfo?.user_id,
        );
        return {
          ...announcement,
          created_at: toFullString(announcement.created_at),
          announcer: {
            id: announcerUserInfo?.id ?? 0,
            login: announcerUserInfo?.login ?? '',
            first_name: announcerUserInfo?.first_name ?? '',
            last_name: announcerUserInfo?.last_name ?? '',
            avatar: announcerUserInfo?.avatar ?? null,
            department: announcerUserInfo?.department ?? null,
            member_id: announcerMemberInfo?.id ?? 0,
          },
        };
      },
    );

    return {
      data: announcementsWithAuthor,
      page,
      limit,
      total: totalCount,
    };
    

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

    const announcerUser = await rpc<User>(this.authClient, AUTH_PATTERNS.GET_USER_BY_ID, { user_id: member.user_id });

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
      throw rpcError(404,   'Announcement not found or does not belong to the club', "Not Found");
    }

    await this.prisma.announcement.delete({
      where: {
        id: announcement_id,
      },
    });

    return {
      status:  200,
      message: 'Announcement deleted successfully',
    }
  }

}
