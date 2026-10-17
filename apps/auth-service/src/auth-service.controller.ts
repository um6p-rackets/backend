import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthServiceService } from './auth-service.service.js';
import { AUTH_PATTERNS, LogoutUserDto, OAuthLoginDto, RegisterDto } from '@app/contracts';
import { LoginDto } from '@app/contracts/auth/dto/login.dto.js';
import { UsersService } from './users/users.service.js';

@Controller()
export class AuthServiceController {
  constructor(
    private readonly authServiceService: AuthServiceService,
    private readonly usersService: UsersService
  ) {}


  @MessagePattern(AUTH_PATTERNS.REGISTER)
  async register(@Payload() dto: RegisterDto) {
    console.log(`[AuthService] Received registration request for email: ${dto.email}`);
    return await this.authServiceService.register(dto);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  async login(@Payload() dto: LoginDto) {
    console.log(`[AuthService] Received login request for email: ${dto.email}`);
    return await this.authServiceService.login(dto);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  async refresh(@Payload() data: { refresh_token: string }) {
    console.log(`[AuthService] Received refresh request`);
    return await this.authServiceService.refresh(data.refresh_token);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async logout(@Payload() dto: LogoutUserDto) {
    console.log(`[AuthService] Received logout request for user ID: ${dto.user_id}`);
    return await this.authServiceService.logout(dto.refresh_token);
  }

  @MessagePattern(AUTH_PATTERNS.OAUTH_LOGIN)
  async oAuthLogin(@Payload() dto: OAuthLoginDto) {
    console.log(`[AuthService] Received OAuth login request`);
    return await this.authServiceService.oAuthLogin(dto);
  }

  @MessagePattern(AUTH_PATTERNS.HEALTH)
  async health() {
    console.log(`[AuthService] Health check requested`);
    return await this.authServiceService.health();
  }

  // get user by id
  @MessagePattern(AUTH_PATTERNS.GET_USER_BY_ID)
  async getUserById(@Payload() data: { userId: string }) {
    console.log(`[AuthService] Received request for user by ID: ${data.userId}`);
    return await this.usersService.findById(Number(data.userId));
  }

  // get user by login
  @MessagePattern(AUTH_PATTERNS.GET_USER_BY_LOGIN)
  async getUserByLogin(@Payload() data: { login: string }) {
    console.log(`[AuthService] Received request for user by login: ${data.login}`);
    return await this.usersService.findByLogin(data.login);
  }

  // get many users by ids
  @MessagePattern(AUTH_PATTERNS.GET_USERS_BY_IDS)
  async getUsersByIds(@Payload() data: { userIds: string[] }) {
    // Defend against undefined payloads over RPC
    const ids = data?.userIds || [];
    console.log(`[AuthService] Received request for users by IDs: ${ids.join(', ')}`);
    return await this.usersService.findManyByIds(ids);
  }

}
