import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import Joi from 'joi';  

import { AuthModule } from './auth/auth.module.js';
  import { QUEUES, AUTH_SERVICE } from '@app/contracts/queues.js';
import { rmqOptions } from '@app/rmq';

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
