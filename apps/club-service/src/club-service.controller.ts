import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Club } from '@app/contracts/club/club.types.js';
import { ClubServiceService } from './club-service.service.js';
import { CLUB_PATTERNS } from '@app/contracts';

@Controller()
export class ClubServiceController {
  constructor(private readonly clubServiceService: ClubServiceService) {}

  @MessagePattern(CLUB_PATTERNS.GET_CLUBS)
  getAllClubs(): Promise<Club[]> {
    console.log(`[ClubService] Received request for all clubs`);
    return this.clubServiceService.getAllClubs();
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB)
  async getClub(data: { club_name: string }): Promise<Club> {
    console.log(`[ClubService] Received request for club name: ${data.club_name}`);
    return this.clubServiceService.getClubByName(data.club_name);
  }
}
