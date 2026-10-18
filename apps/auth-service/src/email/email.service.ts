import { TRANSPORTER_TOKEN } from '@app/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { getPasswordResetTemplate } from './template/email.templates.js';

@Injectable()
export class EmailService {
    constructor(
    @Inject(TRANSPORTER_TOKEN) private readonly transporter: nodemailer.Transporter,
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${rawToken}`;
    const htmlTemplate = getPasswordResetTemplate(resetLink);
    const sender = this.configService.get<string>('SMTP_USER');

    try {
      await this.transporter.sendMail({
        from: `"Rackets Support" <${sender}>`,
        to: email,
        subject: 'Reset your password',
        html: htmlTemplate,
      });
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send password reset email to ${email}:`, error);
    }
  }
}
