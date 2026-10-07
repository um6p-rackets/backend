import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module.js';
import { QUEUES } from '@app/contracts';
import { rmqOptions } from '@app/rmq';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {

  const rmqUrl = process.env.RABBITMQ_URL;
  if (!rmqUrl) throw new Error('RABBITMQ_URL is not set');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,
    rmqOptions(rmqUrl, QUEUES.AUTH),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // app.useGlobalFilters(new AllRpcExceptionsFilter());
  app.enableShutdownHooks();   // lets PrismaService disconnect cleanly on SIGTERM

  await app.listen();          // no port: it connects to RabbitMQ and consumes auth_queue
}
bootstrap();