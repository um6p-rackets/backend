import { Injectable } from '@nestjs/common';
import { rpcError } from '@app/contracts';
import { LoginDto } from '@app/contracts/auth/dto/login.dto.js';
import { UsersService } from './users/users.service.js';
import { TokensService } from './tokens/tokens.service.js';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async login(dto: LoginDto) {
    // 1. Find the user (returns the safe, mapped object via toUser)
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw rpcError(401, 'Invalid email or password', 'Unauthorized');
    }

    // 2. Verify the password 
    const isPasswordValid = await this.usersService.verifyPassword(user.id, dto.password);
    if (!isPasswordValid) {
      throw rpcError(401, 'Invalid email or password', 'Unauthorized');
    }

    // 3. Issue the new JWT & Opaque Refresh Token pair
    const tokens = await this.tokensService.issue(user.id, user.login);

    // 4. Return exact shape for the Gateway
    return {
      user, // Safely mapped, no password hash leak
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw rpcError(401, 'No refresh token provided', 'Unauthorized');
    }
    
    // Rotate the token and return the new set to the Gateway
    return await this.tokensService.rotate(refreshToken);
  }

  async logout(userId: string, refreshToken: string) {
    if (refreshToken) {
      await this.tokensService.revoke(refreshToken);
    }
    return { success: true };
  }
}