import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { ClubAccessService } from '../access/club-access.service.js';


@Module({
  controllers: [SessionsController],
  providers: [SessionsService, ClubAccessService],
})
export class SessionsModule {}
