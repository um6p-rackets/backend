import {
  Achievement,
  AUTH_PATTERNS,
  AUTH_SERVICE,
  CLUB_PATTERNS,
  CLUB_SERVICE,
  GetUserParamDto,
  JoinedClub,
  UserClubRank,
  UserHistoryMatch,
  UserProfileData,
} from '@app/contracts';
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserService } from './user.service.js';

@Controller('users')
export class UserController {
  constructor(
    @Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly userService: UserService,
  ) {}

  @Get(':user_id')
  async getUserById(@Param() { user_id }: GetUserParamDto) {
    console.log('[ClubController] Received request for user by id: ', user_id);
    const user = this.authClient.send(AUTH_PATTERNS.GET_USER_BY_ID, {
      user_id,
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${user_id} not found`);
    }
    return this.authClient.send(AUTH_PATTERNS.GET_USER_BY_ID, { user_id });
  }

}
