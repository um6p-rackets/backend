import { CLUB_PATTERNS, CLUB_SERVICE } from '@app/contracts';
import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import { ClubSlugParamDto } from '@app/contracts/club/dto/club-slug-param.dto.js';
import { DevAuthGuard } from '../auth/dev-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import { WeekQueryDto } from '@app/contracts/club/dto/week-query.dto.js';

@Controller('clubs')
export class ClubController {
  constructor(@Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy) {}

  @Get()
  async getAllClubs() {
    console.log(
      `[ClubController] Received request for all clubs, and send request to Club Service`,
    );
    // Sends { cmd: 'get_all_clubs' } to the Club Service and waits for a reply
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUBS, {}).pipe(
      timeout(5000),
      catchError((e) =>
        throwError(() =>
          e instanceof TimeoutError
            ? new ServiceUnavailableException('Club service is not responding')
            : e,
        ),
      ),
    );

    // firstValueFrom converts the RabbitMQ Observable into a standard Promise
    return await firstValueFrom(response);
  }
  @Get(':slug')
  async getClub(@Param() { slug }: ClubSlugParamDto) {
    console.log(
      `[ClubController] Received request for club slug: ${slug}, and send request to Club Service`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUB, {
      club_slug: slug,
    });
    return response;
  }

  @UseGuards(DevAuthGuard)
  @Get(':slug/status')
  async getClubStatus(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: { id: number },
  ) {
    console.log(
      `[ClubController] Received request for club status for slug: ${slug} and user_id: ${user.id}, and send request to Club Service`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUB_STATUS, {
      club_slug: slug,
      user_id: user.id,
    });
    return response;
  }

  @UseGuards(DevAuthGuard)
  @Get(':slug/sessions')
  async getClubWeekSessions(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: { id: number },
    @Query() { week }: WeekQueryDto,
  ) {
    console.log(
      `[ClubController] Received request for club week sessions for slug: ${slug} and user_id: ${user.id}, and send request to Club Service, week: ${week}`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.GET_CLUB_WEEK_SESSIONS,
      { club_slug: slug, user_id: user.id, week_start_date: week },
    );
    return response;
  }
}
