import { Injectable } from '@nestjs/common';
import {
  RegisterDto,
  LoginDto,
  rpcError,
  AuthTokens,
  AuthResult,
  HealthResult,
  LogoutResult,
  OAuthLoginDto,
  User,
} from '@app/contracts';
import { UsersService } from './users/users.service.js';
import { TokensService } from './tokens/tokens.service.js';
import * as argon2 from 'argon2';
import { randomBytes, randomInt } from 'crypto';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  // health
  async health(): Promise<HealthResult> {
    return {
      version: '1.0.0',
      service: 'AuthService',
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  // register
  async register(dto: RegisterDto): Promise<AuthResult> {
    const { password, ...userData } = dto;

    const user = await this.usersService.createUser({
      ...userData,
      password_hash: await argon2.hash(password),
      avatar: null,
      gender: userData.gender ?? null,
      department: userData.department ?? null,
      phone_number: userData.phone_number ?? null,
    });

    if (!user) {
      throw rpcError(400, 'User registration failed', 'Bad Request');
    }

    // Issue the new JWT & Opaque Refresh Token pair
    const tokens = await this.tokensService.issue(user.id, user.login);

    return {
      user, 
      ...tokens,
    };
  }

  // login
  async login(dto: LoginDto): Promise<AuthResult> {

    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    if (!user) {
      throw rpcError(401, 'Invalid credentials', 'Unauthorized');
    }

    const tokens = await this.tokensService.issue(user.id, user.login);

    // Return exact shape for the Gateway
    return {
      user,
      ...tokens,
    };
  }

  // refresh
  async refresh(refresh_token: string): Promise<AuthTokens> {
    if (!refresh_token) {
      throw rpcError(401, 'No refresh token provided', 'Unauthorized');
    }
    
    // Rotate the token and return the new set to the Gateway
    return await this.tokensService.rotate(refresh_token);
  }

  // OAuth login
  async oAuthLogin(dto: OAuthLoginDto): Promise<AuthResult | null> {
    if (!dto.email_verified) {
      throw rpcError(401, 'Email not verified', 'Unauthorized');
    }

    // Allow up to 3 attempts to gracefully handle DB race conditions
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Case 1: User has IDENTITY in our system, just log them in
      const user = await this.usersService.getUserByIdentity({
        provider: dto.provider,
        subject: dto.subject,
      });

      if (user) {
        const tokens = await this.tokensService.issue(user.id, user.login);
        return { ...tokens, user };
      }

      const existingUser = await this.usersService.findByEmail(dto.email);
      let finalUser: User;

      // Case 2: User exists but doesn't have this IDENTITY, link it
      if (existingUser) {
        await this.usersService.linkIdentityToUser(existingUser.id, dto);
        finalUser = existingUser;
      } 
      // Case 3: User doesn't exist, create a new one with this IDENTITY
      else {
        const login = await this.uniqueLogin(dto.email);
        finalUser = await this.usersService.createIdentityUser(login, dto);
      }

      const tokens = await this.tokensService.issue(finalUser.id, finalUser.login);
      return { ...tokens, user: finalUser };
    }
    throw rpcError(500, 'Could not create account', 'Internal Server Error');
  }

  // logout
  async logout(refresh_token: string): Promise<LogoutResult> {
    if (refresh_token) {
      await this.tokensService.revoke(refresh_token);
    }
    return {
      "success": true,
      "message": "Logged out successfully"
    }
  }

  // ------------------ Helper Methods ------------------

    private async uniqueLogin(email: string): Promise<string> {
      // "John.Doe+123@example.com" => "johndoe123"
      const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
      // Try a few times to find a unique login
      for (let i = 0; i < 5; i++) {
        const candidate = i === 0 ? base : `${base}[${randomInt(1000, 9999)}]`;
        const taken = await this.usersService.findByLogin(candidate);
        // If not taken, return the candidate
        if (!taken)
          return candidate;
      }
      return `${base}${randomBytes(4).toString('hex')}`;
    }

}