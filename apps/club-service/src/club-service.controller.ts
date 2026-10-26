import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  Club,
  ClubMemberStatus,
  ClubWithMembersCountAndCoachFullName,
  UserProfileData,
} from '@app/contracts/club/club.types.js';
import { ClubServiceService } from './club-service.service.js';
import { CLUB_PATTERNS } from '@app/contracts';
import { UpdateClubDto } from '@app/contracts/club/dto/index.js';
import { CreateClubDto } from '@app/contracts/admin/dto/index.js';
import { LeaderboardService } from './leaderboard/leaderboard.service.js';

@Controller()
export class ClubServiceController {
  constructor(
    private readonly clubServiceService: ClubServiceService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @MessagePattern(CLUB_PATTERNS.GET_USER_PROFILE)
  getMemberProfile(data: { user_id: number }): Promise<UserProfileData> {
    console.log(
      `[ClubService] Received request for member profile for user_id: ${data.user_id}`,
    );
    return this.clubServiceService.getUserProfile(data.user_id);
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUBS)
  getAllClubs(): Promise<Club[]> {
    console.log(`[ClubService] Received request for all clubs`);
    return this.clubServiceService.getAllClubs();
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB)
  async getClubWithMembersCountAndCoachFullName(data: {
    club_slug: string;
  }): Promise<ClubWithMembersCountAndCoachFullName> {
    console.log(
      `[ClubService] Received request for club slug: ${data.club_slug}`,
    );
    return this.clubServiceService.getClubWithMembersCountAndCoachFullName(
      data.club_slug,
    );
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB_STATUS)
  async getClubStatus(data: {
    club_slug: string;
    user_id: number;
  }): Promise<ClubMemberStatus> {
    console.log(
      `[ClubService] Received request for club status for slug: ${data.club_slug} and user_id: ${data.user_id}`,
    );
    return this.clubServiceService.getClubStatus(data.club_slug, data.user_id);
  }

  @MessagePattern(CLUB_PATTERNS.PATCH_CLUB_UPDATE)
  async updateClub(data: {
    club_slug: string;
    user_id: number;
    body: UpdateClubDto;
  }): Promise<Club> {
    return this.clubServiceService.updateClub(
      data.club_slug,
      data.user_id,
      data.body,
    );
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB_LEADERBOARD)
  async getClubLeaderboard(data: {
    club_slug: string;
    user_id: number;
    page: number;
    limit: number;
  }) {
    return this.leaderboardService.getClubLeaderboard(
      data.club_slug,
      data.user_id,
      data.page,
      data.limit,
    );
  }

  @MessagePattern(CLUB_PATTERNS.POST_CLUB_JOIN)
  joinClub(
    @Payload() { club_slug, user_id }: { club_slug: string; user_id: number },
  ) {
    return this.clubServiceService.joinClub(club_slug, user_id);
  }

  @MessagePattern(CLUB_PATTERNS.DELETE_CLUB_JOIN)
  cancelJoin(
    @Payload() { club_slug, user_id }: { club_slug: string; user_id: number },
  ) {
    return this.clubServiceService.cancelJoin(club_slug, user_id);
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB_JOIN_REQUESTS)
  getJoinRequests(
    @Payload()
    {
      club_slug,
      user_id,
      page,
      limit,
    }: {
      club_slug: string;
      user_id: number;
      page: number;
      limit: number;
    },
  ) {
    return this.clubServiceService.getJoinRequests(
      club_slug,
      user_id,
      page,
      limit,
    );
  }

  @MessagePattern(CLUB_PATTERNS.POST_CLUB_JOIN_REQUEST_REJECT)
  rejectJoinRequest(
    @Payload()
    {
      club_slug,
      user_id,
      request_id,
    }: {
      club_slug: string;
      user_id: number;
      request_id: number;
    },
  ) {
    return this.clubServiceService.rejectJoinRequest(
      club_slug,
      user_id,
      request_id,
    );
  }

  @MessagePattern(CLUB_PATTERNS.DELETE_CLUB_LEAVE)
  async leaveClub(data: { club_slug: string; user_id: number }) {
    return this.clubServiceService.leaveClub(data.club_slug, data.user_id);
  }

  @MessagePattern(CLUB_PATTERNS.POST_CLUB_ADMIN_CREATE)
  createClub(data: { body: CreateClubDto }) {
    return this.clubServiceService.createClub(data.body);
  }

  @MessagePattern(CLUB_PATTERNS.DELETE_CLUB_ADMIN_DELETE)
  deleteClub(data: { club_slug: string }) {
    return this.clubServiceService.deleteClub(data.club_slug);
  }
}
