import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  app.setGlobalPrefix('api/auth');
  await app.listen(process.env.port ?? 3010);
}
await bootstrap();
