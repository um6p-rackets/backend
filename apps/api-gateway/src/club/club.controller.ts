import { CLUB_PATTERNS, CLUB_SERVICE } from '@app/contracts';
import { Controller, Get, Inject, Param, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError, timeout, TimeoutError } from 'rxjs';

@Controller('clubs')
export class ClubController {
  constructor(@Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy) {}

  @Get()
  async getAllClubs() {
    console.log(`[ClubController] Received request for all clubs, and send request to Club Service`);
    // Sends { cmd: 'get_all_clubs' } to the Club Service and waits for a reply
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUBS, {}).pipe(
  timeout(5000),
  catchError((e) =>
    throwError(() =>
      e instanceof TimeoutError ? new ServiceUnavailableException('Club service is not responding') : e,
    ),
  ),
);

    // firstValueFrom converts the RabbitMQ Observable into a standard Promise
    return await firstValueFrom(response);
  }
	@Get(':club_name')
	async getClub(@Param('club_name') clubName: string) {
    const response = this.clubClient.send(CLUB_PATTERNS.GET_CLUB, { club_name: clubName });
    return await firstValueFrom(response);
  }
}
