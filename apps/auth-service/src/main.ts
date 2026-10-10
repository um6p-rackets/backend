import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module.js';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

// 1. Import dotenv and your raw configuration function
import { config as dotenvConfig } from 'dotenv';

import { QUEUES } from '@app/contracts';
import { rmqOptions } from '@app/rmq';
import { AllRpcExceptionsFilter, configuration } from '@app/common';

async function bootstrap() {
  // 2. Manually load the local .env file before NestJS starts
  // (In production Docker, these are passed natively, so we skip it)
  // if (process.env.NODE_ENV !== 'production') {
  //   dotenvConfig({ path: './apps/auth-service/.env' });
  // }

  // 3. Execute your shared config function directly to get the constructed URL
  const { rabbitmq } = configuration();
  if (!rabbitmq.url) throw new Error('RABBITMQ_URL is missing in configuration');

  // 4. Create the pure microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,
    rmqOptions(rabbitmq.url, QUEUES.AUTH),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllRpcExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen();
}
bootstrap();