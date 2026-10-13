import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { rpcError } from '@app/contracts';

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // 1. Initial Login
  async issue(userId: number, login: string) {
    return this.generateAndSaveTokens(userId, login, randomUUID());
  }

  // 2. Refresh Token Rotation
  async rotate(plainRefreshToken: string) {
    const tokenHash = createHash('sha256').update(plainRefreshToken).digest('hex');
    
    // Find the token and join the user table to get the login string for the new JWT
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw rpcError(401, 'Invalid refresh token', 'Unauthorized');
    }

    if (tokenRecord.is_revoked) {
      // SECURITY ALERT: Token reuse detected! Revoke the entire family.
      await this.prisma.refreshToken.updateMany({
        where: { family_id: tokenRecord.family_id },
        data: { is_revoked: true },
      });
      throw rpcError(401, 'Token reuse detected. Please log in again.', 'Unauthorized');
    }

    if (tokenRecord.expires_at < new Date()) {
      throw rpcError(401, 'Refresh token expired', 'Unauthorized');
    }

    // Mark the old token as revoked
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { is_revoked: true },
    });

    // Issue a new token pair in the SAME family
    return this.generateAndSaveTokens(tokenRecord.user_id, tokenRecord.user.login, tokenRecord.family_id);
  }

  // 3. Logout
  async revoke(plainRefreshToken: string) {
    const tokenHash = createHash('sha256').update(plainRefreshToken).digest('hex');
    
    // updateMany doesn't throw an error if the token doesn't exist
    await this.prisma.refreshToken.updateMany({
      where: { token_hash: tokenHash },
      data: { is_revoked: true },
    });
  }

  // --- Private Helper ---
  private async generateAndSaveTokens(userId: number, login: string, familyId: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: String(userId), login },
      { expiresIn: '15m' },
    );

    const plainRefreshToken = randomBytes(48).toString('base64url');
    const tokenHash = createHash('sha256').update(plainRefreshToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token_hash: tokenHash,
        family_id: familyId,
        user_id: userId,
        expires_at: expiresAt,
        is_revoked: false,
      },
    });

    return { accessToken, refreshToken: plainRefreshToken };
  }
}