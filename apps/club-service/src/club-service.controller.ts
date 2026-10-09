import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Club } from '@app/contracts/club/club.types.js';
import { ClubServiceService } from './club-service.service.js';
import { CLUB_PATTERNS } from '@app/contracts';

@Controller()
export class ClubServiceController {
  constructor(private readonly clubServiceService: ClubServiceService) {}

  @MessagePattern(CLUB_PATTERNS.GET_CLUBS)
  getAllClubs(): Club[] {
    console.log(`[ClubService] Received request for all clubs`);
    const result = this.clubServiceService.getAllClubs();
    return result;
  }

  @MessagePattern(CLUB_PATTERNS.GET_CLUB)
  getClub(data: { club_name: string }): Club | null {
    console.log(`[ClubService] Received request for club name: ${data.club_name}`);
    return this.clubServiceService.getClubByName(data.club_name);
  }
}
