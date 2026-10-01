import { Controller, Get } from '@nestjs/common';
import { ClubServiceService } from './club-service.service.js';

@Controller()
export class ClubServiceController {
  constructor(private readonly clubServiceService: ClubServiceService) {}

  @Get()
  getHello(): string {
    return this.clubServiceService.getHello();
  }
}
