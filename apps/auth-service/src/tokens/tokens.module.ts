import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokensService } from './tokens.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.accessSecret'),
        verifyOptions: { algorithms: ['HS256'] },
        signOptions: { expiresIn: configService.getOrThrow<string>('jwt.expiresIn') as any },
      }),
    }),
  ],
  providers: [TokensService],
  exports: [TokensService]
})
export class TokensModule {}