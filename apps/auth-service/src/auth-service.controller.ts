import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthServiceService } from './auth-service.service.js';
import { AUTH_PATTERNS } from '@app/contracts';
import { LoginDto } from '@app/contracts/auth/dto/login.dto.js';

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}


  @MessagePattern(AUTH_PATTERNS.REGISTER)
  async register(@Payload() dto: any) {
    console.log(`[AuthService] Received registration request for email: ${dto.email}`);
    return await this.authServiceService.register(dto);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  async login(@Payload() dto: LoginDto) {
    console.log(`[AuthService] Received login request for email: ${dto.email}`);
    return await this.authServiceService.login(dto);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  async refresh(@Payload() data: { refreshToken: string }) {
    console.log(`[AuthService] Received refresh request`);
    return await this.authServiceService.refresh(data.refreshToken);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async logout(@Payload() data: { userId: string; refreshToken: string }) {
    console.log(`[AuthService] Received logout request for user ID: ${data.userId}`);
    return await this.authServiceService.logout(data.refreshToken);
  }


  // /me
  @MessagePattern(AUTH_PATTERNS.GET_USER)
  async getUser(@Payload() data: { userId: string }) {
    console.log(`[AuthService] Received request for user ID: ${data.userId}`);
    return await this.authServiceService.getUser(data.userId);
  }

  @MessagePattern(AUTH_PATTERNS.HEALTH)
  async health() {
    console.log(`[AuthService] Health check requested`);
    return await this.authServiceService.health();
  }

  // get user by login
  @MessagePattern(AUTH_PATTERNS.GET_USER_BY_LOGIN)
  async getUserByLogin(@Payload() data: { login: string }) {
    console.log(`[AuthService] Received request for user by login: ${data.login}`);
    return await this.authServiceService.getUserByLogin(data.login);
  }

  // get many users by ids
  @MessagePattern(AUTH_PATTERNS.GET_USERS_BY_IDS)
  async getUsersByIds(@Payload() data: { userIds: string[] }) {
    // Defend against undefined payloads over RPC
    const ids = data?.userIds || [];
    
    console.log(`[AuthService] Received request for users by IDs: ${ids.join(', ')}`);
    return await this.authServiceService.getUsersByIds(ids);
  }

}
