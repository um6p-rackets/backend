import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApiGatewayModule } from './api-gateway.module.js';
import { QUEUES } from '@app/contracts';
import { RpcToHttpFilter } from '@app/common';
import { rmqOptions } from '@app/rmq';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiGatewayModule);

  const configService = app.get(ConfigService);
  const rmqUrl = configService.getOrThrow<string>('rabbitmq.url')!;

  app.set('trust proxy', 1);                 // behind nginx, needed for secure cookies
  app.setGlobalPrefix('api/v1');
  app.use(helmet(), cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new RpcToHttpFilter());

  app.connectMicroservice(rmqOptions(rmqUrl, QUEUES.GATEWAY));
  await app.startAllMicroservices();
  await app.listen(3010, '0.0.0.0');
}
bootstrap();
