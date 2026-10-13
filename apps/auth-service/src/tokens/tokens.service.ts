import { Injectable } from '@nestjs/common';

@Injectable()
export class TokensService {
  async generateTokens(userId: number, login: string) {
    // Fake JWT generation
    console.log(`[TokensService] Generating mock tokens for User ${userId}`);
    
    return {
      accessToken: 'mock_access_token_123',
      refreshToken: 'mock_refresh_token_456',
    };
  }
}