import { Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
import { SmsConfig } from '@config/configuration';
import { SmsSender } from './sms-sender.port';

/**
 * Real SMS adapter — only ever constructed when SmsConfig's Twilio fields
 * are all present (see identity.module.ts's factory); otherwise
 * ConsoleSmsSender stays active, same pattern as ResendEmailSender.
 */
export class TwilioSmsSender implements SmsSender {
  private readonly logger = new Logger(TwilioSmsSender.name);
  private readonly client: Twilio;

  constructor(private readonly config: SmsConfig) {
    this.client = new Twilio(config.twilioAccountSid, config.twilioAuthToken);
  }

  async send(phone: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        to: phone,
        from: this.config.twilioFromNumber,
        body: message,
      });
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${phone}: ${(err as Error).message}`);
      throw new Error(`SMS delivery failed: ${(err as Error).message}`);
    }
  }
}
