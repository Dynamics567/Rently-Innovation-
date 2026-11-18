import { Injectable } from '@nestjs/common';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { ReferralFraudFlagRepository } from '../repositories/referral-fraud-flag.repository';
import { ReferralFraudFlag } from '../entities/referral-fraud-flag.entity';

@Injectable()
export class ReferralFraudFlagService {
  constructor(
    private readonly flagRepository: ReferralFraudFlagRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** Called from SignupReferralListener's catch — a flagged signup is never blocked, only recorded for review. */
  async flag(input: {
    referralCode: string | null;
    attemptedUserId: string;
    reasonCode: string;
    message: string;
  }): Promise<void> {
    const row = this.flagRepository.create(input);
    await this.flagRepository.save(row);
  }

  async search(
    openOnly: boolean,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPage<ReferralFraudFlag>> {
    return this.flagRepository.search(openOnly, cursor, limit);
  }

  async countOpen(): Promise<number> {
    return this.flagRepository.countOpen();
  }

  async acknowledge(id: string, adminId: string): Promise<ReferralFraudFlag> {
    const flag = await this.flagRepository.findByIdOrFail(id, 'Fraud flag');
    const before = { acknowledgedAt: flag.acknowledgedAt };
    flag.acknowledgedAt = new Date();
    flag.acknowledgedByAdminId = adminId;
    const saved = await this.flagRepository.save(flag);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'referral_fraud_flag.acknowledge',
      entityType: 'ReferralFraudFlag',
      entityId: id,
      before,
      after: { acknowledgedAt: saved.acknowledgedAt },
    });
    return saved;
  }
}
