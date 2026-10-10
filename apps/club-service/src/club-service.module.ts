import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, envFiles } from '@app/common';
import { ClubServiceController } from './club-service.controller.js';
import { ClubServiceService } from './club-service.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: envFiles('club-service'),
    }),
    PrismaModule,
  ],
  controllers: [ClubServiceController],
  providers: [ClubServiceService],
})
export class ClubServiceModule {}
