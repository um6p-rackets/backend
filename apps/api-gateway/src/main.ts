import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
// import { RpcToHttpFilter } from '@app/common';

import { ApiGatewayModule } from './api-gateway.module.js';
import { QUEUES } from '@app/contracts';
import { rmqOptions } from '@app/rmq';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiGatewayModule);
  app.set('trust proxy', 1);                 // behind nginx, needed for secure cookies
  app.setGlobalPrefix('api/v1');
  app.use(helmet(), cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  //TODO: I need to implement RpcToHttpFilter 'libs/common/src/rpc-to-http.filter.ts'
  // app.useGlobalFilters(new RpcToHttpFilter());

  app.connectMicroservice(rmqOptions(process.env.RABBITMQ_URL!, QUEUES.GATEWAY));
  await app.startAllMicroservices();
  await app.listen(3001, '0.0.0.0');
}
bootstrap();
