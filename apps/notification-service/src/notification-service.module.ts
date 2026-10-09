import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, envFiles } from '@app/common';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
        load: [configuration], 
        envFilePath: envFiles('notification-service'),
  })],
  controllers: [],
  providers: [],
})
export class NotificationServiceModule {}
