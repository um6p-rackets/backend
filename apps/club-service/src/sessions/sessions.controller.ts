import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CLUB_PATTERNS } from '@app/contracts';
import { SessionsService } from './sessions.service.js';

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}
  @MessagePattern(CLUB_PATTERNS.GET_CLUB_WEEK_SESSIONS)
  async getClubWeekSessions(data: { club_slug: string; week_start_date: string }) {
    console.log(
      `[SessionsController] Received request for club slug: ${data.club_slug} and week start date: ${data.week_start_date}`,
    );
    return this.sessionsService.getClubWeekSessions(data.club_slug, data.week_start_date);
  }

  
}
