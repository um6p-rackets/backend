import { Inject, Injectable } from '@nestjs/common';
import { ClubAccessService } from '../access/club-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { now, rpc, toFullString } from '@app/common';
import { AUTH_PATTERNS, AUTH_SERVICE, rpcError, User } from '@app/contracts';
import { ClientProxy } from '@nestjs/microservices';
import {
  Member,
  MemberWithUser,
  Paginated,
  MemberRole,
  JoinRequestStatus,
} from '@app/contracts/club/club.types.js';
import { AddMemberDto } from '@app/contracts/club/dto/index.js';

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
        const user: User | null = await rpc<User | null>(
          this.authClient,
          AUTH_PATTERNS.GET_USER_BY_LOGIN,
          { login },
        );
        if (!user) {
          throw rpcError(
            404,
            `User with login ${login} not found`,
            'Not Found',
          );
        }
        const member = await this.prisma.member.findFirst({
          where: {
            club_id: club.id,
            user_id: user.id,
            left_at: null,
          },
        });
        if (!member) {
          throw rpcError(
            404,
            `User ${login} is not a member of club ${club_slug}`,
            'Not Found',
          );
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
        // if (!role) role = 0;
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
          { user_ids: ids },
        );
        if (users.length != members.length) {
          console.error(
            `MembersService.getClubMembers: Mismatch in number of members and users. Members: ${members.length}, Users: ${users.length}`,
          );
        }
        const members_with_user_summery: (MemberWithUser | null)[] =
          members.map((member) => {
            const user = users.find((user) => user.id === member.user_id);
            if (!user) {
              console.error(
                `MembersService.getClubMembers: User not found for member with user_id: ${member.user_id}`,
              );
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
          });
        const filtered_members = members_with_user_summery.filter(
          (member) => member !== null,
        ) as MemberWithUser[];
        return {
          data: filtered_members,
          total: totalMembers,
          page,
          limit,
        };
      }
    }
  }

  async addClubMember(
    club_slug: string,
    user_id: number,
    body: AddMemberDto,
  ): Promise<Member> {
    const { club, member } = await this.clubAccessService.requireRole(
      club_slug,
      user_id,
      1, // Require at least admin role to add members
    );
    if (body.role && body.role > 1) {
      throw rpcError(
        400,
        `You can't update role to a higher or equal role than your own.`,
        'Bad Request',
      );
    }
    if (member && member.role == 1 && body.role == 1) {
      throw rpcError(
        400,
        `Only Coach can add another leader to the club.`,
        'Bad Request',
      );
    }

    // Check if the user is already a member of the club
    const existingMember = await this.prisma.member.findFirst({
      where: {
        club_id: club.id,
        user_id: body.user_id,
        left_at: null,
      },
    });

    if (existingMember) {
      throw rpcError(
        409,
        `User with id ${body.user_id} is already a member of club ${club_slug}`,
        'Conflict',
      );
    }

    // Check if the user exists in the auth service
    const user: User | null = await rpc<User | null>(
      this.authClient,
      AUTH_PATTERNS.GET_USER_BY_ID,
      { user_id: body.user_id },
    );
    if (!user) {
      throw rpcError(
        404,
        `User with id ${body.user_id} not found in auth service`,
        'Not Found',
      );
    }
    // add the member (or re-activate a former one) and close the user's pending request.
    // Both writes run in ONE transaction: both happen, or none.
    const [saved, accepted] = await this.prisma.$transaction([
      this.prisma.member.upsert({
        where: { club_id_user_id: { club_id: club.id, user_id: body.user_id } },
        update: { left_at: null, role: body.role ?? 0 },
        create: {
          club_id: club.id,
          user_id: body.user_id,
          role: body.role ?? 0,
        },
      }),
      this.prisma.joinRequest.updateMany({
        where: {
          club_id: club.id,
          user_id: body.user_id,
          status: JoinRequestStatus.PENDING,
        },
        data: {
          status: JoinRequestStatus.ACCEPTED,
          decided_at: new Date(),
          decided_by: member.id, // the leader who accepted
        },
      }),
    ]);

    if (accepted.count === 1) {
      // step 6: notify the user "you were accepted" (count 1 = it came from a request)
    }

    return {
      ...saved,
      joined_at: toFullString(saved.joined_at),
      left_at: saved.left_at ? toFullString(saved.left_at) : null,
    };
  }

  async updateClubMemberRole(
    club_slug: string,
    user_id: number,
    body: { role: 0 | 1 },
    member_id: number,
  ): Promise<Member> {
    const { club, member } = await this.clubAccessService.requireRole(
      club_slug,
      user_id,
      2, // Require at least admin role to update member roles
    );

    if (body.role >= member.role) {
      throw rpcError(
        400,
        `You can't update role to a higher or equal role than your own.`,
        'Bad Request',
      );
    }
    // Check if the member exists in the club
    const existingMember = await this.prisma.member.findFirst({
      where: {
        id: member_id,
        club_id: club.id,
        left_at: null,
      },
    });

    if (!existingMember) {
      throw rpcError(
        404,
        `Member with id ${member_id} not found in club ${club_slug}`,
        'Not Found',
      );
    }

    // check if member role already has the same role as the new role
    if (existingMember.role === body.role) {
      throw rpcError(
        400,
        `Member with id ${member_id} already has the role ${body.role}`,
        'Bad Request',
      );
    }

    // you can't less role of a member who has a higher or equal role than you
    if (existingMember.role >= member.role) {
      throw rpcError(
        400,
        `You can't change the role of a member who has a higher or equal role than your own.`,
        'Bad Request',
      );
    }

    // Update the member's role
    const updatedMember = await this.prisma.member.update({
      where: {
        id: member_id,
      },
      data: {
        role: body.role,
      },
    });

    return {
      ...updatedMember,
      joined_at: toFullString(updatedMember.joined_at),
      left_at: updatedMember.left_at
        ? toFullString(updatedMember.left_at)
        : null,
    };
  }

  async removeClubMember(
    club_slug: string,
    user_id: number,
    member_id: number,
  ) {
    const { club, member } = await this.clubAccessService.requireRole(
      club_slug,
      user_id,
      MemberRole.LEADER, // Require at least leader role to remove members
    );
    // get the member to be removed
    const memberToRemove = await this.prisma.member.findFirst({
      where: {
        id: member_id,
        club_id: club.id,
        left_at: null,
      },
    });

    if (!memberToRemove) {
      throw rpcError(
        404,
        `Member with id ${member_id} not found in club ${club_slug}`,
        'Not Found',
      );
    }

    // you can't remove a member who has a higher or equal role than you
    if (memberToRemove.role >= member.role) {
      throw rpcError(
        400,
        `You can't remove a member who has a higher or equal role than your own.`,
        'Bad Request',
      );
    }

    // Set the left_at timestamp to mark the member as removed
    const updatedMember = await this.prisma.member.update({
      where: {
        id: member_id,
        club_id: club.id,
      },
      data: {
        left_at: now(),
      },
    });

    return {
      status: 204,
      message: `Member with id ${member_id} has been removed from club ${club_slug}`,
    };
  }
}
