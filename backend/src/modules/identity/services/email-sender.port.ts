export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

/**
 * Port/adapter boundary for email delivery — same pattern as SmsSender
 * (sms-sender.port.ts) and the PaymentProviderPort described in
 * docs/ARCHITECTURE.md. AuthService depends on this interface, not on
 * Resend/SendGrid directly, so plugging in a real provider later never
 * touches auth logic.
 */
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

/**
 * Development-only adapter — logs instead of sending a real email. No
 * transactional email provider is configured yet, so this is what actually
 * runs today; password-reset links only reach a real inbox once this is
 * swapped for a real EmailSender implementation.
 */
export class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[EMAIL -> ${to}] ${subject}\n${body}`);
  }
}
