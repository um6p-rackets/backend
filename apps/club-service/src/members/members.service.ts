import { Injectable } from "@nestjs/common";
import { ClubAccessService } from "../access/club-access.service.js";
import { PrismaService } from "../prisma/prisma.service.js";



@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService, private readonly clubAccessService: ClubAccessService) {}

  async getClubMembers(club_slug: string, user_id: number, limit?: number, page?: number, login?: string, role?: number) {
    const { club } = await this.clubAccessService.requireRole(club_slug, user_id, 0);
    if (!limit) limit = 10;
    if (!page) page = 1;
    if (!role) role = 0;

    if (login) {
      // send request to auth service to get user by login
      return {
        members: [{
          id: 1,
          user_id: 1,
          club_id: club.id,
          role,
          joined_at: new Date(),
          left_at: null
        }],
        totalMembers: 1,
        totalPages: 1,
        currentPage: 1,
      };
    } else {
      const members = await this.prisma.member.findMany({
        where: {
          club_id: club.id,
          role,
          left_at: null,
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalMembers = await this.prisma.member.count({
        where: {
          club_id: club.id,
          role,
          left_at: null,
        }
      });

      // TODO: send request to auth service to get user info for each member

      return {
        members,
        totalMembers,
        totalPages: Math.ceil(totalMembers / limit),
        currentPage: page,
      };
    }
  }
}