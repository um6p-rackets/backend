import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

import { QUEUES } from '@app/contracts/queues.js';
import { NOTIFICATION_SERVICE } from '@app/contracts';
import { rmqOptions } from '@app/rmq';
import { NotificationController } from './notifcations.controller.js';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_SERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rmqUrl = configService.getOrThrow<string>('rabbitmq.url')!;
          return rmqOptions(rmqUrl, QUEUES.NOTIFICATION, true);
        },
      },
    ]),
  ],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
