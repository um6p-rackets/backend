import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Club } from '@app/contracts/club/club.types.js';
import { ClubServiceService } from './club-service.service.js';

@Controller()
export class ClubServiceController {
  constructor(private readonly clubServiceService: ClubServiceService) {}

  @MessagePattern({ cmd: 'get_all_clubs' })
  getAllClubs(): Club[] {
    console.log(`[ClubService] Received request for all clubs`);
    const result = this.clubServiceService.getAllClubs();
    return result;
  }
}
