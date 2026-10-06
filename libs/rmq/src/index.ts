import { RmqOptions, Transport } from '@nestjs/microservices';

export function rmqOptions(url: string, queue: string): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: queue,
      noAck: false, // Forces manual acknowledgment so messages aren't lost if an app crashes
      queueOptions: {
        durable: true, // The queue survives even if the RabbitMQ Docker container restarts
      },
    },
  };
}
