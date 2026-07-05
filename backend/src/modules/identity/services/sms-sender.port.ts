export const SMS_SENDER = Symbol('SMS_SENDER');

/**
 * Port/adapter boundary for SMS delivery — mirrors the PaymentProviderPort
 * pattern in docs/ARCHITECTURE.md. OtpService depends on this interface, not
 * on Termii/Twilio directly, so swapping providers never touches auth logic.
 */
export interface SmsSender {
  send(phone: string, message: string): Promise<void>;
}

/** Development-only adapter — logs instead of sending a real SMS. */
export class ConsoleSmsSender implements SmsSender {
  async send(phone: string, message: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[SMS -> ${phone}] ${message}`);
  }
}
