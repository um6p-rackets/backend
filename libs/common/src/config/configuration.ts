import { readFileSync, existsSync } from 'fs';

export const configuration = () => {
  const readSecret = (filePath?: string): string => {
    return filePath && existsSync(filePath) ? readFileSync(filePath, 'utf8').trim() : '';
  };

  // 1. If present in local .env, use it.
  // 2. Otherwise (in Docker), build it from secrets.
  const dbUrl = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${readSecret(process.env.DB_PASSWORD_FILE)}@database:5432/${process.env.DB_NAME}?schema=${process.env.DB_SCHEMA}`;

  const rmqUrl = process.env.RABBITMQ_URL || 
    `amqp://${process.env.RABBITMQ_USER}:${readSecret(process.env.RABBITMQ_PASSWORD_FILE)}@rabbitmq:5672`;

  return {
    database: { url: dbUrl },
    rabbitmq: { url: rmqUrl },
  };
};
