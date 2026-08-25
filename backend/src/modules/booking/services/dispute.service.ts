import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { Dispute } from '../entities/dispute.entity';
import { DisputeRepository } from '../repositories/dispute.repository';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { DisputeResolution } from '../enums/dispute-resolution.enum';
import { BookingService } from './booking.service';

/**
 * Depends on BookingService (to finalize a resolved dispute) — never the
 * reverse, so no module cycle: BookingService creates Dispute rows directly
 * via DisputeRepository (see recordInspection()), it never calls into this
 * service.
 */
@Injectable()
export class DisputeService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly disputeRepository: DisputeRepository,
    private readonly bookingService: BookingService,
  ) {}

  async findByIdOrFail(id: string): Promise<Dispute> {
    return this.disputeRepository.findByIdOrFail(id, 'Dispute');
  }

  async findByBooking(bookingId: string): Promise<Dispute | null> {
    return this.disputeRepository.findByBooking(bookingId);
  }

  async listAll(status?: DisputeStatus): Promise<Dispute[]> {
    return this.disputeRepository.findAll(status);
  }

  /** [Provider] Proposes how much of the deposit to withhold, with a reason the renter can see. */
  async proposeDeduction(
    disputeId: string,
    providerUserId: string,
    amountMinor: number,
    note?: string,
  ): Promise<Dispute> {
    const dispute = await this.findByIdOrFail(disputeId);
    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.CONTESTED) {
      throw DomainException.conflict(
        ErrorCode.DISPUTE_INVALID_STATE,
        'A deduction can only be proposed on an open or contested dispute.',
      );
    }
    const booking = await this.bookingService.findByIdOrFail(dispute.bookingId);
    if (amountMinor > booking.depositMinor) {
      throw DomainException.unprocessable(
        ErrorCode.DISPUTE_DEDUCTION_EXCEEDS_DEPOSIT,
        `Cannot deduct more than the ₦${(booking.depositMinor / 100).toLocaleString()} deposit held.`,
      );
    }

    dispute.proposedDeductionMinor = amountMinor;
    dispute.proposedBy = providerUserId;
    dispute.proposedAt = new Date();
    dispute.proposalNote = note ?? null;
    dispute.status = DisputeStatus.PROPOSED;
    return this.disputeRepository.save(dispute);
  }

  /** [Renter] Accept finalizes immediately (deposit released minus the agreed deduction); reject parks it as CONTESTED for admin review. */
  async respondToProposal(
    disputeId: string,
    renterUserId: string,
    decision: 'accept' | 'reject',
    note?: string,
  ): Promise<Dispute> {
    const dispute = await this.findByIdOrFail(disputeId);
    if (dispute.status !== DisputeStatus.PROPOSED) {
      throw DomainException.conflict(
        ErrorCode.DISPUTE_INVALID_STATE,
        'There is no pending proposal to respond to.',
      );
    }
    const booking = await this.bookingService.findByIdOrFail(dispute.bookingId);
    if (booking.renterId !== renterUserId) {
      throw DomainException.forbidden(ErrorCode.FORBIDDEN, "You aren't the renter on this booking.");
    }

    if (decision === 'reject') {
      dispute.status = DisputeStatus.CONTESTED;
      dispute.resolutionNote = note ?? null;
      return this.disputeRepository.save(dispute);
    }

    return this.dataSource.transaction(async (manager) => {
      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolution = DisputeResolution.AGREED;
      dispute.finalDeductionMinor = dispute.proposedDeductionMinor;
      dispute.resolvedBy = renterUserId;
      dispute.resolvedAt = new Date();
      dispute.resolutionNote = note ?? null;
      const saved = await manager.getRepository(Dispute).save(dispute);
      await this.bookingService.finalizeDispute(
        manager,
        dispute.bookingId,
        saved.finalDeductionMinor ?? 0,
        renterUserId,
      );
      return saved;
    });
  }

  /** [Admin] Can resolve from any non-resolved state — the backstop when the two parties can't agree. */
  async adminResolve(
    disputeId: string,
    adminId: string,
    finalDeductionMinor: number,
    note: string,
  ): Promise<Dispute> {
    const dispute = await this.findByIdOrFail(disputeId);
    if (dispute.status === DisputeStatus.RESOLVED) {
      throw DomainException.conflict(ErrorCode.DISPUTE_INVALID_STATE, 'This dispute is already resolved.');
    }
    const booking = await this.bookingService.findByIdOrFail(dispute.bookingId);
    if (finalDeductionMinor > booking.depositMinor) {
      throw DomainException.unprocessable(
        ErrorCode.DISPUTE_DEDUCTION_EXCEEDS_DEPOSIT,
        `Cannot deduct more than the ₦${(booking.depositMinor / 100).toLocaleString()} deposit held.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolution = DisputeResolution.ADMIN_DECIDED;
      dispute.finalDeductionMinor = finalDeductionMinor;
      dispute.resolvedBy = adminId;
      dispute.resolvedAt = new Date();
      dispute.resolutionNote = note;
      const saved = await manager.getRepository(Dispute).save(dispute);
      await this.bookingService.finalizeDispute(manager, dispute.bookingId, finalDeductionMinor, adminId);
      return saved;
    });
  }
}
