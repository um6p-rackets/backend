import { Controller, UnauthorizedException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthServiceService } from './auth-service.service.js';
import { rpcError, AUTH_PATTERNS } from '@app/contracts';
import { LoginDto } from '@app/contracts/auth/dto/login.dto.js'; // Adjust path if needed

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  // 1. Add the Login Listener
  @MessagePattern(AUTH_PATTERNS.LOGIN)
  async login(@Payload() dto: LoginDto) {
    console.log(`[AuthService] Received login request for email: ${dto.email}`);
    // Pass it to the service layer to do the actual database/hash checking
    return await this.authServiceService.login(dto);
  }

  @MessagePattern(AUTH_PATTERNS.GET_USER)
  getUser(@Payload() data: { userId: string }) {
    console.log(`[AuthService] Received request for user ID: ${data.userId}`);
    return { id: data.userId, username: 'abnsila', role: 'admin', status: 'active' };
  }

}