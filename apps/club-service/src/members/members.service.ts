import { Inject, Injectable } from '@nestjs/common';
import { ClubAccessService } from '../access/club-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { rpc, toFullString } from '@app/common';
import { AUTH_PATTERNS, AUTH_SERVICE, rpcError, User } from '@app/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { MemberWithUser, Paginated } from '@app/contracts/club/club.types.js';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly clubAccessService: ClubAccessService,
  ) {}

  async getClubMembers(
    club_slug: string,
    user_id: number,
    limit?: number,
    page?: number,
    login?: string,
    role?: number,
  ): Promise<Paginated<MemberWithUser>> {
    {
      const { club } = await this.clubAccessService.requireRole(
        club_slug,
        user_id,
        0,
      );

      if (login) {
        // send request to auth service to get user by login
        const user: (User|null) = await rpc<User|null>(
          this.authClient,
          AUTH_PATTERNS.GET_USER_BY_LOGIN,
          { login },
        );
        if (!user) {
          throw rpcError(404, `User with login ${login} not found`, "Not Found");
        }
        const member = await this.prisma.member.findFirst({
          where: {
            club_id: club.id,
            user_id: user.id,
            left_at: null,
          },
        });
        if (!member) {
          throw rpcError(404, `User ${login} is not a member of club ${club_slug}`, "Not Found");
        }
        const member_with_user_summery: MemberWithUser = {
          id: member.id,
          club_id: member.club_id,
          user_id: member.user_id,
          role: member.role,
          joined_at: String(member.joined_at),
          left_at: member.left_at ? String(member.left_at) : null,
          user: {
            id: user.id,
            login: user.login,
            first_name: user.first_name,
            last_name: user.last_name,
            department: user.department,
            avatar: user.avatar,
          },
        };

        return {
          data: [member_with_user_summery],
          total: 1,
          page: 1,
          limit: 10,
        };
      } else {
        if (!limit) limit = 10;
        if (!page) page = 1;
        if (!role) role = 0;
        console.log("I am here man + 1");
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
          },
        });

        // TODO: send request to auth service to get user info for each member
        const ids: number[] = members.map((member) => member.user_id);
        const users: User[] = await rpc<User[]>(
          this.authClient,
          AUTH_PATTERNS.GET_USERS_BY_IDS,
          { userIds: ids },
        );
        if ( users.length != members.length) {
          console.error(`MembersService.getClubMembers: Mismatch in number of members and users. Members: ${members.length}, Users: ${users.length}`);
        }
        const members_with_user_summery: (MemberWithUser|null)[] = members.map(
          (member) => {
            const user = users.find((user) => user.id === member.user_id);
            if (!user) {
              console.error(`MembersService.getClubMembers: User not found for member with user_id: ${member.user_id}`);
              return null;
            }
            return {
              id: member.id,
              club_id: member.club_id,
              user_id: member.user_id,
              role: member.role,
              joined_at: toFullString(member.joined_at),
              left_at: member.left_at ? toFullString(member.left_at) : null,
              user: {
                id: user.id,
                login: user.login,
                first_name: user.first_name,
                last_name: user.last_name,
                department: user.department,
                avatar: user.avatar,
              },
            };
          },
        );
        const filtered_members = members_with_user_summery.filter((member) => member !== null) as MemberWithUser[];
        return {
          data: filtered_members,
          total: totalMembers,
          page,
          limit,
        };
      }
    }
  }
}
