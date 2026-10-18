import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, envFiles } from '@app/common';
// import { NotificationServiceController } from './notification-service.controller.js';
import { NotificationServiceService } from './notification-service.service.js';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
        load: [configuration], 
        envFilePath: envFiles('notification-service'),
  })],
  // controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
