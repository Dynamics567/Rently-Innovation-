import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { STORAGE_PORT, StoragePort } from '@common/storage/storage.port';
import { VerificationDocumentRepository } from '../repositories/verification-document.repository';
import { VerificationDocument } from '../entities/verification-document.entity';
import { VerificationDocumentStatus, VerificationDocumentType } from '../enums/verification-status.enum';

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
      documents.map(async (document) => ({
        ...document,
        url: await this.storage.getUrl(document.storageKey),
      })),
    );
  }

  async approve(documentId: string, adminId: string, note?: string): Promise<VerificationDocument> {
    const document = await this.findReviewableOrFail(documentId);
    document.status = VerificationDocumentStatus.APPROVED;
    document.reviewedBy = adminId;
    document.reviewedAt = new Date();
    document.reviewNotes = note ?? null;
    return this.documentRepository.save(document);
  }

  async reject(documentId: string, adminId: string, reason: string): Promise<VerificationDocument> {
    const document = await this.findReviewableOrFail(documentId);
    document.status = VerificationDocumentStatus.REJECTED;
    document.reviewedBy = adminId;
    document.reviewedAt = new Date();
    document.reviewNotes = reason;
    return this.documentRepository.save(document);
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
