import {
  Achievement,
  AUTH_PATTERNS,
  AUTH_SERVICE,
  CLUB_PATTERNS,
  CLUB_SERVICE,
  GetUserParamDto,
  JoinedClub,
  User,
  UserClubRank,
  UserHistoryMatch,
  UserProfile,
  UserProfileData,
} from '@app/contracts';
import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserService } from './user.service.js';
import { Throttle } from '@nestjs/throttler';
import { REQUEST_LIMIT, REQUEST_TTL } from '@app/common/auth/auth.constants.js';
import { type AuthenticatedUser } from '@app/common/auth/authenticated-user.js';
import { rpc } from '@app/common/helpers/rpc.helper.js';

@Controller('users')
export class UserController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    @Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy,
    private readonly userService: UserService,
  ) {}

  // @Get(':user_id')
  // async getUserById(@Param() { user_id }: GetUserParamDto) {
  //   console.log('[ClubController] Received request for user by id: ', user_id);
  //   const user = this.authClient.send(AUTH_PATTERNS.GET_USER_BY_ID, {
  //     user_id,
  //   });
  //   if (!user) {
  //     throw new NotFoundException(`User with ID ${user_id} not found`);
  //   }
  //   return this.authClient.send(AUTH_PATTERNS.GET_USER_BY_ID, { user_id });
  // }


  @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
  @HttpCode(200)
  @Get('me/profile')
  async getCurrentUserProfile(@CurrentUser() authenticatedUser: AuthenticatedUser) {
    console.log('[UserController] Received request for current user profile: ', authenticatedUser.id);
    // Get Raw User First
    const user = await rpc<User>(this.authClient, AUTH_PATTERNS.GET_USER_BY_ID, { user_id: authenticatedUser.id });
    if (!user) {
      throw new NotFoundException(`User with ID ${authenticatedUser.id} not found`);
    }
    // Get User Profile Data from Club Service [if he's a member]
    const memberProfile = await rpc<UserProfileData>(this.clubClient, CLUB_PATTERNS.GET_USER_PROFILE, { user_id: authenticatedUser.id });
    return {
      user,
      memberProfile,
    };
  }

  @Throttle({ default: { limit: REQUEST_LIMIT, ttl: REQUEST_TTL } })
  @HttpCode(200)
  @Get(':user_id/profile')
  async getUserProfile(
    @Param() { user_id }: GetUserParamDto,
    // return type
  ) : Promise<UserProfile> {
    console.log('[UserController] Received request for user profile by id: ', user_id);
    // Get Raw User First
    const user = await rpc<User>(this.authClient, AUTH_PATTERNS.GET_USER_BY_ID, { user_id });
    if (!user) {
      throw new NotFoundException(`User with ID ${user_id} not found`);
    }
    // Get User Profile Data from Club Service [if he's a member]
    const memberProfile = await rpc<UserProfileData>(this.clubClient, CLUB_PATTERNS.GET_USER_PROFILE, { user_id });
    return {
      user,
      memberProfile,
    };  
  }


}
