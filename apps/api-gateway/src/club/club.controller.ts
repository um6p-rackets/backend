import { CLUB_PATTERNS, CLUB_SERVICE } from '@app/contracts';
import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('clubs')
export class ClubController {
  constructor(@Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy) {}

  @Get()
  async getAllClubs() {
    // Sends { cmd: 'get_all_clubs' } to the Club Service and waits for a reply
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUBS, {});

    // firstValueFrom converts the RabbitMQ Observable into a standard Promise
    return await firstValueFrom(response);
  }
	@Get(':club_name')
	async getClub(@Param('club_name') clubName: string) {
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUB, { club_name: clubName });
    return await firstValueFrom(response);
  }
}
