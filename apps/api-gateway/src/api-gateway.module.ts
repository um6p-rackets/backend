import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';  

import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    // This is the environment configuration module that loads the .env file and validates the environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBITMQ_URL: Joi.string().uri().required(),
      })
    }),
    // This is the authentication module that handles user authentication and authorization
    AuthModule, 
  ],
})
export class ApiGatewayModule {}
