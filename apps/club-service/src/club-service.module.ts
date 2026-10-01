import { Module } from '@nestjs/common';
import { ClubServiceController } from './club-service.controller.js';
import { ClubServiceService } from './club-service.service.js';

@Module({
  imports: [],
  controllers: [ClubServiceController],
  providers: [ClubServiceService],
})
export class ClubServiceModule {}
