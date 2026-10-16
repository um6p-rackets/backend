import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import Joi from 'joi';

import { configuration, envFiles, jwtConfig } from '@app/common';
import { AuthModule } from './auth/auth.module.js';
import { ClubModule } from './club/club.module.js';
import googleOauthConfig from './common/config/google-oauth.config.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';

@Module({
  imports: [
    // This is the environment configuration module that loads the .env file and validates the environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, jwtConfig, googleOauthConfig],
      envFilePath: envFiles('api-gateway'),
      validationSchema: Joi.object({
        RABBITMQ_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
        FRONTEND_REDIRECT_URL: Joi.string().uri().required(),
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [jwtConfig.KEY],
      useFactory: (config: ConfigType<typeof jwtConfig>) => config,
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
