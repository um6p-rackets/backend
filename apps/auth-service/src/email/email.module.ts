import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service.js';
import { TRANSPORTER_TOKEN } from '@app/contracts/queues.js';


@Module({
  providers: [
    {
      provide: TRANSPORTER_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return nodemailer.createTransport({
          host: configService.get<string>('SMTP_HOST'),
          port: configService.get<number>('SMTP_PORT', 587),
          secure: configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: configService.get<string>('SMTP_USER'),
            pass: configService.get<string>('SMTP_PASS'),
          },
        });
      },
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}