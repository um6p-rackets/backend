import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';

import { AuthModule } from './auth/auth.module.js';
import { configuration, envFiles } from '@app/common';
import { ClubModule } from './club/club.module.js';
import { NotificationModule } from './notification/notification.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: envFiles('api-gateway'),
      validationSchema: Joi.object({
        RABBITMQ_URL: Joi.string().uri().required(),
      }),
    }),
    AuthModule,
    ClubModule,
    NotificationModule,
  ],
})
export class ApiGatewayModule {}
