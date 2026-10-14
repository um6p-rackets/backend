import { CLUB_PATTERNS, CLUB_SERVICE } from '@app/contracts';
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { ClubSlugParamDto } from '@app/contracts/club/dto/club-slug-param.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { WeekQueryDto } from '@app/contracts/club/dto/week-query.dto.js';
import { addDays, type AuthenticatedUser, mondayOf, today } from '@app/common';
import { Public } from '../common/decorators/public.decorator.js';
import { rpc } from '../common/helpers/rpc.helper.js';

@Controller('clubs')
export class ClubController {
  constructor(@Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy) {}

  @Public()
  @Get()
  async getAllClubs() {
    console.log(`[ClubController] Received request for all clubs, and send request to Club Service`);
    return await rpc(this.clubClient, CLUB_PATTERNS.GET_CLUBS, {});
  }

  @Public()
  @Get(':slug')
  async getClub(@Param() { slug }: ClubSlugParamDto) {
    console.log(`[ClubController] Received request for club slug: ${slug}, and send request to Club Service`);
    return await rpc(this.clubClient, CLUB_PATTERNS.GET_CLUB, {
      club_slug: slug,
    });
  }

  @Get(':slug/status')
  async getClubStatus(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(`[ClubController] Received request for club status for slug: ${slug} and user_id: ${user.id}, and send request to Club Service`);
    return await rpc(this.clubClient, CLUB_PATTERNS.GET_CLUB_STATUS, {
      club_slug: slug,
      user_id: user.id,
    });
  }

  @Get(':slug/sessions')
  async getClubWeekSessions(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query() { week }: WeekQueryDto,
  ) {
    console.log(
      `[ClubController] Received request for club week sessions for slug: ${slug} and user_id: ${user.id}, and send request to Club Service, week: ${week}`,
    );
    // if week is not provided, set it to current week monday
    if (!week) {
      week = mondayOf(today());
    }
    //  check if week is valid date
    else if (isNaN(Date.parse(week))) {
      throw new BadRequestException('Invalid week date');
    }

    // check that the week day is not in far future more than current week + 1 week
    const maxDay = addDays(mondayOf(today()), 2*7); // current week + 1 week

    if (week >= maxDay) {
      throw new BadRequestException(
        `Week date cannot be in the future more than current week + 1 week, max allowed: ${maxDay}`,
      );
    }

    // check that the week day is not in far past more than 1 year
    const minDay = addDays(mondayOf(today()), -365); // current week - 1 year

    if (week < minDay) {
      throw new BadRequestException(
        `Week date cannot be in the past more than 1 year, min allowed: ${minDay}`,
      );
    }
    
    const response = this.clubClient.send(
      CLUB_PATTERNS.GET_CLUB_WEEK_SESSIONS,
      { club_slug: slug, user_id: user.id, week_start_date: week },
    );
    return response;
  }

  @Post(':slug/sessions/:session_id/attend')
  async attendSession(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Param('session_id') sessionId: string,
  ) {
    console.log(
      `[ClubController] Received request to attend session with id: ${sessionId} for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.POST_CLUB_SESSION_ATTEND,
      { club_slug: slug, user_id: user.id, session_id: sessionId },
    );
    return response;
  }



}