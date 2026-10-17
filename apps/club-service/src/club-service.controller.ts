import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Club, ClubMemberStatus, ClubWithMembersCount } from '@app/contracts/club/club.types.js';
import { ClubServiceService } from './club-service.service.js';
import { CLUB_PATTERNS } from '@app/contracts';
import { UpdateClubDto } from '@app/contracts/club/dto/index.js';

@Controller()
export class ClubServiceController {
  constructor(private readonly clubServiceService: ClubServiceService) {}

  @MessagePattern(CLUB_PATTERNS.GET_CLUBS)
  getAllClubs(): Promise<Club[]> {
    console.log(`[ClubService] Received request for all clubs`);
    return this.clubServiceService.getAllClubs();
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB)
  async getClubWithMembersCount(data: { club_slug: string }): Promise<ClubWithMembersCount> {
    console.log(`[ClubService] Received request for club slug: ${data.club_slug}`);
    return this.clubServiceService.getClubWithMembersCount(data.club_slug);
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB_STATUS)
  async getClubStatus(data: { club_slug: string; user_id: number }): Promise<ClubMemberStatus> {
    console.log(`[ClubService] Received request for club status for slug: ${data.club_slug} and user_id: ${data.user_id}`);
    return this.clubServiceService.getClubStatus(data.club_slug, data.user_id);
  }

  @MessagePattern(CLUB_PATTERNS.PATCH_CLUB_UPDATE)
  async updateClub(data: { club_slug: string; user_id: number; body: UpdateClubDto }): Promise<Club> {
    return this.clubServiceService.updateClub(data.club_slug, data.user_id, data.body);
  }
}
