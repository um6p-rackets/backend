import { Injectable } from "@nestjs/common";
import { ClubAccessService } from "../access/club-access.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { rpc } from "@app/common";
import { AUTH_PATTERNS, User } from "@app/contracts";
import { ClientProxy } from "@nestjs/microservices";
import { MemberWithUser, Paginated } from "@app/contracts/club/club.types.js";



@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService,
    private readonly authClient: ClientProxy,
    private readonly clubAccessService: ClubAccessService) {}

  async getClubMembers(club_slug: string, user_id: number, limit?: number, page?: number, login?: string, role?: number): Promise<Paginated<MemberWithUser>>{ {
    const { club, member } = await this.clubAccessService.requireRole(club_slug, user_id, 0);
    if (!limit) limit = 10;
    if (!page) page = 1;
    if (!role) role = 0;

    if (login) {
      // send request to auth service to get user by login
      const user: User = await rpc<User>(this.authClient, AUTH_PATTERNS.GET_USER_BY_LOGIN, { login });
      return {
        data: [{
          ...member,
          user: {
            id: user.id,
            login: user.login,
            first_name: user.first_name,
            last_name: user.last_name,
            department: user.department,
            avatar: user.avatar,
          }
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