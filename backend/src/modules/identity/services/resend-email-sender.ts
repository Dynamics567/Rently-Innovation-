import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailConfig } from '@config/configuration';
import { EmailSender } from './email-sender.port';

/**
 * Real transactional-email adapter — only ever constructed when
 * EmailConfig.resendApiKey is present (see identity.module.ts's factory);
 * otherwise ConsoleEmailSender stays active. Implements the same
 * EmailSender port AuthService already depends on, so nothing upstream
 * changes when this swaps in.
 */
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly resend: Resend;

  constructor(private readonly config: EmailConfig) {
    this.resend = new Resend(config.resendApiKey);
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.config.from,
      to,
      subject,
      text: body,
    });
    if (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }
}
