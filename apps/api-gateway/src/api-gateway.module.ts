import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';

import { AuthModule } from './auth/auth.module.js';
import { configuration, envFiles } from '@app/common';
import { ClubModule } from './club/club.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';

@Module({
  imports: [
    // This is the environment configuration module that loads the .env file and validates the environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: envFiles('api-gateway'),
      validationSchema: Joi.object({
        RABBITMQ_URL: Joi.string().uri().required(),
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.accessSecret'),
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // This is the authentication module that handles user authentication and authorization
    AuthModule,
    ClubModule,
  ],
  // Registering guards globally [We never have to remember to add @UseGuards(JwtAuthGuard) to a new controller]
    providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },   // first: rate limit
    { provide: APP_GUARD, useClass: JwtAuthGuard },     // then: authenticate
  ],
})
export class ApiGatewayModule {}
