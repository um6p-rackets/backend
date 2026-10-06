import { NestFactory } from '@nestjs/core';
import { ClubServiceModule } from './club-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(ClubServiceModule);
  await app.listen(process.env.port ?? 3000);
}
await bootstrap();
