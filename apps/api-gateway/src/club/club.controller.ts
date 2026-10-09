import { CLUB_SERVICE } from '@app/contracts';
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('club')
export class ClubController {
  constructor(@Inject(CLUB_SERVICE) private readonly clubClient: ClientProxy) {}

  @Get()
  async testClubService() {
    console.log(`[ApiGateway] Testing Club Service`);
    // Sends { cmd: 'get_all_clubs' } to the Club Service and waits for a reply
    const response = this.clubClient.send({ cmd: 'get_all_clubs' }, {});

    // firstValueFrom converts the RabbitMQ Observable into a standard Promise
    return await firstValueFrom(response);
  }
}
