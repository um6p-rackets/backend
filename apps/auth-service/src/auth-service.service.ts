import { Injectable } from '@nestjs/common';
import {
  RegisterDto,
  LoginDto,
  rpcError,
  User,
  AuthTokens,
  AuthResult,
  HealthResult,
  LogoutResult,
} from '@app/contracts';
import { UsersService } from './users/users.service.js';
import { TokensService } from './tokens/tokens.service.js';
import * as argon2 from 'argon2';

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

    const user = await this.usersService.create({
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
  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw rpcError(401, 'No refresh token provided', 'Unauthorized');
    }
    
    // Rotate the token and return the new set to the Gateway
    return await this.tokensService.rotate(refreshToken);
  }

  // logout
  async logout(refreshToken: string): Promise<LogoutResult> {
    if (refreshToken) {
      await this.tokensService.revoke(refreshToken);
    }
    return {
      "success": true,
      "message": "Logged out successfully"
    }
  }

  // me / getUser
  async getUser(userId: string): Promise<User> {
    const user = await this.usersService.findById(Number(userId));
    if (!user) {
      throw rpcError(404, 'User not found', 'Not Found');
    }
    return user;
  }
  async getUserById(userId: string): Promise<User|null> {
    const user = await this.usersService.findById(Number(userId));
    return user;
  }

  // used by club or notification service
  async getUserByLogin(login: string): Promise<(User|null)> {
    const user = await this.usersService.findByLogin(login);
    return user;
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    const users = await this.usersService.findManyByIds(userIds);
    return users;
  }
}