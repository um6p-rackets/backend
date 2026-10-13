import { Injectable } from '@nestjs/common';
import { rpcError } from '@app/contracts';
import { LoginDto } from '@app/contracts/auth/dto/login.dto.js';
// Import your other services (assuming you exported them from their modules)
import { UsersService } from './users/users.service.js';
import { TokensService } from './tokens/tokens.service.js';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async login(dto: LoginDto) {
    // 1. Find the user in the database
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw rpcError(401, 'Invalid email or password', 'Unauthorized');
    }

    // 2. Verify the password (assuming you have a verifyPassword method using argon2)
    const isPasswordValid = await this.usersService.verifyPassword(user.id, dto.password);
    if (!isPasswordValid) {
      throw rpcError(401, 'Invalid email or password', 'Unauthorized');
    }

    // 3. Generate the JWTs
    const tokens = await this.tokensService.generateTokens(user.id, user.login);

    // 4. Return the exact shape the API Gateway is expecting: { user, accessToken, refreshToken }
    // Make sure to strip the password hash out of the user object before returning it!
    const { password, ...safeUser } = user;

    return {
      user: safeUser,
      ...tokens,
    };
  }
}