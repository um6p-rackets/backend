import { Injectable } from '@nestjs/common';

@Injectable()
export class ClubServiceService {
  getHello(): string {
    return 'Hello World from club service!';
  }
}
