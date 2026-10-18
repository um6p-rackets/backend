import { CLUB_PATTERNS, CLUB_SERVICE } from '@app/contracts';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { WeekQueryDto } from '@app/contracts/club/dto/week-query.dto.js';
import { addDays, type AuthenticatedUser, mondayOf, today } from '@app/common';
import { Public } from '../common/decorators/public.decorator.js';
import { rpc } from '../../../../libs/common/src/helpers/rpc.helper.js';
import { Body } from '@nestjs/common';
import {
  DeleteSessionQueryDto,
  ClubSlugParamDto,
  SessionParamDto,
  UpdateSessionDto,
  CreateSessionDto,
  MembersQueryDto,
  AddMemberDto,
  UpdateMemberRoleParamDto,
  UpdateMemberRoleParamDto as RemoveMemberParamDto, 
  UpdateClubDto,
  PaginationQueryDto,
  CreateAnnouncementDto,
  DeleteAnnouncementParamDto,
  CreateDocumentDto,
  DeleteDocumentParamDto,
  CreateAchievementDto,
  DeleteAchievementParamDto,
} from '@app/contracts/club/dto/index.js';

@Controller('clubs')
export class ClubController {
  constructor(@Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy) {}

  @Public()
  @Get()
  async getAllClubs() {
    console.log(
      `[ClubController] Received request for all clubs, and send request to Club Service`,
    );
    return await rpc(this.clubClient, CLUB_PATTERNS.GET_CLUBS, {});
  }

  @Public()
  @Get(':slug')
  async getClub(@Param() { slug }: ClubSlugParamDto) {
    console.log(
      `[ClubController] Received request for club slug: ${slug}, and send request to Club Service`,
    );
    return await rpc(this.clubClient, CLUB_PATTERNS.GET_CLUB, {
      club_slug: slug,
    });
  }

  @Get(':slug/status')
  async getClubStatus(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(
      `[ClubController] Received request for club status for slug: ${slug} and user_id: ${user.id}, and send request to Club Service`,
    );
    return await rpc(this.clubClient, CLUB_PATTERNS.GET_CLUB_STATUS, {
      club_slug: slug,
      user_id: user.id,
    });
  }

  // sessions
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
    const maxDay = addDays(mondayOf(today()), 2 * 7); // current week + 1 week

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
    @Param() { slug, session_id }: SessionParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(
      `[ClubController] Received request to attend session with id: ${session_id} for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.POST_CLUB_SESSION_ATTEND,
      { club_slug: slug, user_id: user.id, session_id: session_id },
    );
    return response;
  }

  @Delete(':slug/sessions/:session_id/attend')
  async unattendSession(
    @Param() { slug, session_id }: SessionParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(
      `[ClubController] Received request to unattend session with id: ${session_id} for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.DELETE_CLUB_SESSION_ATTEND,
      { club_slug: slug, user_id: user.id, session_id: session_id },
    );
    return response;
  }

  @Post(':slug/sessions')
  async createSession(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSessionDto,
  ) {
    console.log(
      `[ClubController] Received request to create session for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service with body: ${JSON.stringify(body)}`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.POST_CLUB_SESSION_CREATE,
      { club_slug: slug, user_id: user.id, body: body },
    );
    return response;
  }

  @Patch(':slug/sessions/:session_id')
  async updateSession(
    @Param() { slug, session_id }: SessionParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateSessionDto,
  ) {
    console.log(
      `[ClubController] Received request to update session with id: ${session_id} for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service with body: ${JSON.stringify(body)}`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.PATCH_CLUB_SESSION_UPDATE,
      { club_slug: slug, user_id: user.id, session_id: session_id, body: body },
    );
    return response;
  }

  @Delete(':slug/sessions/:session_id')
  async deleteSession(
    @Param() { slug, session_id }: SessionParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query() { apply_to_future }: DeleteSessionQueryDto,
  ) {
    console.log(
      `[ClubController] Received request to delete session with id: ${session_id} for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service with apply_to_future: ${apply_to_future}`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.DELETE_CLUB_SESSION_DELETE,
      {
        club_slug: slug,
        user_id: user.id,
        session_id: session_id,
        apply_to_future: apply_to_future ?? false,
      },
    );
    return response;
  }

  // GET /clubs/:slug/members?page=&limit=&role=&search=
  @Get(':slug/members')
  async getClubMembers(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query() { page, limit, role, login }: MembersQueryDto,
  ) {
    console.log(
      `[ClubController] Received request to get members for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service with query parameters: ${JSON.stringify({ page, limit, role, login })}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUB_MEMBERS, {
      club_slug: slug,
      user_id: user.id,
      page,
      limit,
      role,
      login,
    });
    return response;
  }

  // POST /clubs/:slug/members
  @Post(':slug/members')
  async addClubMember(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddMemberDto,
  ) {
    console.log(
      `[ClubController] Received request to add member for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service with body: ${JSON.stringify(body)}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.POST_CLUB_MEMBER_ADD, {
      club_slug: slug,
      user_id: user.id,
      body,
    });
    return response;
  }

  // PATCH /clubs/:slug/members/:member_id/role
  @Patch(':slug/members/:member_id/role')
  async updateClubMemberRole(
    @Param() { slug, member_id }: UpdateMemberRoleParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { role: 0 | 1 },
  ) {
    console.log(
      `[ClubController] Received request to update member role for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service with body: ${JSON.stringify(body)}`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.PATCH_CLUB_MEMBER_ROLE_UPDATE,
      {
        club_slug: slug,
        user_id: user.id,
        body,
        member_id: parseInt(member_id, 10),
      },
    );
    return response;
  }

  // DELETE /clubs/:slug/members/:member_id It sets left_at, so history stays.
  @Delete(':slug/members/:member_id')
  async removeClubMember(
    @Param() { slug, member_id }: RemoveMemberParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(
      `[ClubController] Received request to remove member for club slug: ${slug} and user_id: ${user.id}, and send request to Club Service`,
    );
    const response = this.clubClient.send(
      CLUB_PATTERNS.DELETE_CLUB_MEMBER_REMOVE,
      {
        club_slug: slug,
        user_id: user.id,
        member_id: parseInt(member_id, 10),
      },
    );
    return response;
  }

  // PATCH /clubs/:slug
  @Patch(':slug')
  async updateClub(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateClubDto,
  ) {
    console.log(
      `[ClubController] Received request to update club for slug: ${slug} and user_id: ${user.id}, and send request to Club Service with body: ${JSON.stringify(body)}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.PATCH_CLUB_UPDATE, {
      club_slug: slug,
      user_id: user.id,
      body,
    });
    return response;
  }

  // GET /clubs/:slug/announcements?page=&limit=: members only, newest first, returns Paginated<AnnouncementWithAuthor>.
  @Get(':slug/announcements')
  async getClubAnnouncements(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query() { page, limit }: PaginationQueryDto,
  ) {
    console.log(
      `[ClubController] Received request to get club announcements for slug: ${slug} and user_id: ${user.id}, and send request to Club Service with page: ${page} and limit: ${limit}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUB_ANNOUNCEMENTS, {
      slug: slug,
      user_id: user.id,
      page,
      limit,
    });
    return response;
  }

  // POST /clubs/:slug/announcements
  @Post(':slug/announcements')
  async createClubAnnouncement(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAnnouncementDto,
  ) {
    console.log(
      `[ClubController] Received request to create club announcement for slug: ${slug} and user_id: ${user.id}, and send request to Club Service with body: ${JSON.stringify(body)}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.POST_CLUB_ANNOUNCEMENT_CREATE, {
      slug: slug,
      user_id: user.id,
      description: body.description,
    });
    return response;
  }

  // DELETE /clubs/:slug/announcements/:announcement_id
  @Delete(':slug/announcements/:announcement_id')
  async deleteClubAnnouncement(
    @Param() { slug, announcement_id }: DeleteAnnouncementParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(
      `[ClubController] Received request to delete club announcement for slug: ${slug} and user_id: ${user.id}, and send request to Club Service with announcement_id: ${announcement_id}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.DELETE_CLUB_ANNOUNCEMENT_DELETE, {
      slug: slug,
      user_id: user.id,
      announcement_id: parseInt(announcement_id, 10),
    });
    return response;
  }

  // GET /clubs/:slug/documents?page=&limit=
  @Get(':slug/documents')
  async getClubDocuments(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query() { page, limit }: PaginationQueryDto,
  ) {
    console.log(
      `[ClubController] Received request to get club documents for slug: ${slug} and user_id: ${user.id}, and send request to Club Service with page: ${page} and limit: ${limit}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUB_DOCUMENTS, {
      slug: slug,
      user_id: user.id,
      page,
      limit,
    });
    return response;
  }

  // POST /clubs/:slug/documents
  @Post(':slug/documents')
  async createClubDocument(
    @Param() { slug }: ClubSlugParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDocumentDto,
  ) {
    console.log(
      `[ClubController] Received request to create club document for slug: ${slug} and user_id: ${user.id}, and send request to Club Service with body: ${JSON.stringify(body)}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.POST_CLUB_DOCUMENT_CREATE, {
      slug: slug,
      user_id: user.id,
      title: body.title,
      description: body.description,
      path: body.path,
    });
    return response;
  }

  // DELETE /clubs/:slug/documents/:document_id
  @Delete(':slug/documents/:document_id')
  async deleteClubDocument(
    @Param() { slug, document_id }: DeleteDocumentParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(
      `[ClubController] Received request to delete club document for slug: ${slug} and user_id: ${user.id}, and send request to Club Service with document_id: ${document_id}`,
    );
    const response = this.clubClient.send(CLUB_PATTERNS.DELETE_CLUB_DOCUMENT_DELETE, {
      slug: slug,
      user_id: user.id,
      document_id: parseInt(document_id, 10),
    });
    return response;
  }
}