import { Inject, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { SMS_SENDER, SmsSender } from './sms-sender.port';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;

/**
 * In-memory OTP store — same caveat as InMemoryIdempotencyStore: correct for
 * one instance, must move to Redis before horizontal scaling (docs/ARCHITECTURE.md
 * §5). Attempt counting here is what stops OTP brute-forcing; rate limiting
 * at the route level (ThrottlerModule) is the second layer of defense.
 */
@Injectable()
export class OtpService {
  private readonly store = new Map<string, OtpRecord>();

  constructor(@Inject(SMS_SENDER) private readonly smsSender: SmsSender) {}

  async requestOtp(phone: string): Promise<void> {
    const code = randomInt(100000, 999999).toString();
    this.store.set(phone, { code, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000, attempts: 0 });
    await this.smsSender.send(phone, `Your Rently verification code is ${code}. It expires in 5 minutes.`);
  }

  verifyOtp(phone: string, code: string): boolean {
    const record = this.store.get(phone);
    if (!record) {
      throw DomainException.unprocessable(ErrorCode.OTP_INVALID_OR_EXPIRED, 'No OTP was requested for this number.');
    }
    if (Date.now() > record.expiresAt) {
      this.store.delete(phone);
      throw DomainException.unprocessable(ErrorCode.OTP_INVALID_OR_EXPIRED, 'This code has expired.');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      this.store.delete(phone);
      throw DomainException.unprocessable(
        ErrorCode.OTP_INVALID_OR_EXPIRED,
        'Too many attempts. Please request a new code.',
      );
    }
    record.attempts += 1;
    if (record.code !== code) {
      throw DomainException.unprocessable(ErrorCode.OTP_INVALID_OR_EXPIRED, 'Incorrect code.');
    }
    this.store.delete(phone);
    return true;
  }
}
