import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { createHash, randomBytes, randomUUID } from 'crypto';

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

    async issue(userId: number, login: string) {
    // 1. Sign the short-lived JWT Access Token (15 minutes)
    const accessToken = await this.jwt.signAsync(
      { sub: String(userId), login },
      { expiresIn: '15m' }
    );

    // 2. Generate a secure, opaque Refresh Token (48 random bytes)
    const plainRefreshToken = randomBytes(48).toString('base64url');

    // 3. Hash the token for database storage (prevent theft if DB leaks)
    const tokenHash = createHash('sha256').update(plainRefreshToken).digest('hex');

    // 4. Create a new family ID for rotation tracking
    const familyId = randomUUID();

    // 5. Calculate expiration (7 days from right now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 6. Save the hash and family metadata to PostgreSQL
    await this.prisma.refreshToken.create({
      data: {
        token_hash: tokenHash,
        family_id: familyId,
        user_id: userId,
        expires_at: expiresAt,
        is_revoked: false,
      },
    });

    // 7. Return the plain refresh token to the API Gateway.
    // The Gateway will put this plain string into the user's secure cookie.
    return {
      accessToken,
      refreshToken: plainRefreshToken,
    };
  }
}
