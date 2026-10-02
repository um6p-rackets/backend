import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  app.setGlobalPrefix('api/notification');
  await app.listen(process.env.port ?? 3030);
}
await bootstrap();
