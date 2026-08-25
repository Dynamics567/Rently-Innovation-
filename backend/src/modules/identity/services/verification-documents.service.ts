import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { STORAGE_PORT, StoragePort } from '@common/storage/storage.port';
import { AuditLogService } from '@common/audit/audit-log.service';
import { AuditActorType } from '@common/audit/audit-actor-type.enum';
import { DomainEvents } from '@common/events/domain-events';
import { VerificationDocumentRepository } from '../repositories/verification-document.repository';
import { VerificationDocument } from '../entities/verification-document.entity';
import { VerificationDocumentStatus, VerificationDocumentType } from '../enums/verification-status.enum';
import { ProviderProfileService } from './provider-profile.service';

/**
 * Per-document review, distinct from ProviderProfileService's whole-profile
 * verificationStatus: which combination of approved documents is enough to
 * verify a provider is a real policy call an admin makes explicitly (see
 * approveVerification/rejectVerification), not something derived
 * automatically from document review outcomes here.
 */
@Injectable()
export class VerificationDocumentsService {
  constructor(
    private readonly documentRepository: VerificationDocumentRepository,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly providerProfileService: ProviderProfileService,
  ) {}

  async upload(
    providerId: string,
    docType: VerificationDocumentType,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<VerificationDocument> {
    const key = `verification-documents/${providerId}/${randomUUID()}`;
    await this.storage.upload({ key, body: file.buffer, contentType: file.mimetype });
    const document = this.documentRepository.create({
      providerId,
      docType,
      storageKey: key,
      status: VerificationDocumentStatus.PENDING,
    });
    return this.documentRepository.save(document);
  }

  async listForProvider(providerId: string): Promise<Array<VerificationDocument & { url: string }>> {
    const documents = await this.documentRepository.findByProvider(providerId);
    return Promise.all(
      documents.map(async (document) => {
        // Object.assign (not a `{...document}` spread) keeps the VerificationDocument
        // prototype intact, so ClassSerializerInterceptor's @Exclude() on storageKey
        // still applies -- a spread here silently turns this into a plain object and
        // leaks the private storage key to the client.
        const url = await this.storage.getUrl(document.storageKey);
        return Object.assign(document, { url });
      }),
    );
  }

  async approve(documentId: string, adminId: string, note?: string): Promise<VerificationDocument> {
    const document = await this.findReviewableOrFail(documentId);
    document.status = VerificationDocumentStatus.APPROVED;
    document.reviewedBy = adminId;
    document.reviewedAt = new Date();
    document.reviewNotes = note ?? null;
    const saved = await this.documentRepository.save(document);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'verification_document.approve',
      entityType: 'VerificationDocument',
      entityId: documentId,
      before: { status: VerificationDocumentStatus.PENDING },
      after: { status: saved.status, reviewNotes: saved.reviewNotes },
    });
    await this.emitReviewedEvent(saved);
    return saved;
  }

  async reject(documentId: string, adminId: string, reason: string): Promise<VerificationDocument> {
    const document = await this.findReviewableOrFail(documentId);
    document.status = VerificationDocumentStatus.REJECTED;
    document.reviewedBy = adminId;
    document.reviewedAt = new Date();
    document.reviewNotes = reason;
    const saved = await this.documentRepository.save(document);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: 'verification_document.reject',
      entityType: 'VerificationDocument',
      entityId: documentId,
      before: { status: VerificationDocumentStatus.PENDING },
      after: { status: saved.status, reviewNotes: saved.reviewNotes },
    });
    await this.emitReviewedEvent(saved);
    return saved;
  }

  private async emitReviewedEvent(document: VerificationDocument): Promise<void> {
    const providerUserId = await this.providerProfileService
      .getById(document.providerId)
      .then((p) => p.userId)
      .catch(() => null);
    if (!providerUserId) return;
    this.eventEmitter.emit(DomainEvents.VerificationDocumentReviewed, {
      recipientId: providerUserId,
      docType: document.docType,
      status: document.status,
      reviewNotes: document.reviewNotes,
    });
  }

  private async findReviewableOrFail(documentId: string): Promise<VerificationDocument> {
    const document = await this.documentRepository.findByIdOrFail(documentId, 'Verification document');
    if (document.status !== VerificationDocumentStatus.PENDING) {
      throw DomainException.conflict(
        ErrorCode.VERIFICATION_DOCUMENT_ALREADY_REVIEWED,
        'This document has already been reviewed.',
      );
    }
    return document;
  }
}
