import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { UsersService } from '@modules/identity/services/users.service';
import { PointsLedgerRepository, LeaderboardRow } from '../repositories/points-ledger.repository';
import { AmbassadorProfileRepository } from '../repositories/ambassador-profile.repository';
import { PointsLedgerEntry } from '../entities/points-ledger-entry.entity';
import { PointsLedgerEntryType } from '../enums/points-ledger-entry-type.enum';

export interface RecordPointsParams {
  ambassadorId: string;
  type: PointsLedgerEntryType;
  pointsDelta: number;
  sourceEntityType?: string;
  sourceEntityId?: string;
  reason?: string;
  createdByAdminId?: string;
}

@Injectable()
export class PointsLedgerService {
  constructor(
    private readonly pointsLedgerRepository: PointsLedgerRepository,
    private readonly ambassadorRepository: AmbassadorProfileRepository,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** Append-only — same optional-manager convention as AuditLogService.record() / finance's Transaction recorders, for a future caller needing same-transaction atomicity. No current call site needs it yet. */
  async record(params: RecordPointsParams, manager?: EntityManager): Promise<PointsLedgerEntry> {
    const row = this.pointsLedgerRepository.create(params);
    return manager ? manager.getRepository(PointsLedgerEntry).save(row) : this.pointsLedgerRepository.save(row);
  }

  async getBalance(ambassadorId: string): Promise<number> {
    return this.pointsLedgerRepository.getBalance(ambassadorId);
  }

  async getBalances(ambassadorIds: string[]): Promise<Map<string, number>> {
    return this.pointsLedgerRepository.getBalances(ambassadorIds);
  }

  async getHistory(ambassadorId: string, cursor?: string, limit?: number): Promise<CursorPage<PointsLedgerEntry>> {
    return this.pointsLedgerRepository.findByAmbassadorId(ambassadorId, cursor, limit);
  }

  /** [Admin] Brief §7's "authorized manual adjustments" — required reason, audited the same as every other admin override in this module. pointsDelta may be negative (a correction). */
  async manualAdjust(ambassadorId: string, pointsDelta: number, adminId: string, reason: string): Promise<PointsLedgerEntry> {
    await this.ambassadorRepository.findByIdOrFail(ambassadorId, 'Ambassador profile');
    if (!Number.isInteger(pointsDelta) || pointsDelta === 0) {
      throw DomainException.unprocessable(ErrorCode.VALIDATION_FAILED, 'Points adjustment must be a non-zero whole number.');
    }
    const entry = await this.record({
      ambassadorId,
      type: PointsLedgerEntryType.MANUAL_ADJUSTMENT,
      pointsDelta,
      reason,
      createdByAdminId: adminId,
    });
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'points_ledger.manual_adjust',
      entityType: 'AmbassadorProfile',
      entityId: ambassadorId,
      before: null,
      after: { pointsDelta, reason },
    });
    return entry;
  }

  /** [Admin] Ranked by verified balance with the official tie-break applied (see the repository's own doc comment) — names resolved via one batch lookup, never per-row. */
  async getLeaderboard(limit?: number): Promise<Array<LeaderboardRow & { name: string | null }>> {
    const rows = await this.pointsLedgerRepository.getLeaderboard(limit);
    if (!rows.length) return [];
    const users = await this.usersService.getBasicProfilesByIds(rows.map((r) => r.userId));
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return rows.map((r) => ({ ...r, name: nameById.get(r.userId) ?? null }));
  }
}
