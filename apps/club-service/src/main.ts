import { NestFactory } from '@nestjs/core';
import { ClubServiceModule } from './club-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(ClubServiceModule);
  app.setGlobalPrefix('api/club');
  await app.listen(process.env.port ?? 3020);
}
await bootstrap();
