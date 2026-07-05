import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@common/base/base.entity';
import { VerificationDocumentStatus, VerificationDocumentType } from '../enums/verification-status.enum';
import { ProviderProfile } from './provider-profile.entity';

@Entity('verification_documents')
export class VerificationDocument extends BaseEntity {
  @ManyToOne(() => ProviderProfile, (provider) => provider.verificationDocuments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ name: 'doc_type', type: 'enum', enum: VerificationDocumentType })
  docType: VerificationDocumentType;

  /**
   * Key into the private (never public) object storage bucket — see
   * docs/ARCHITECTURE.md §6. Excluded from serialization: a signed, short-lived
   * URL is generated on demand by the service layer, never a raw storage key.
   */
  @Exclude()
  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  @Column({ type: 'enum', enum: VerificationDocumentStatus, default: VerificationDocumentStatus.PENDING })
  status: VerificationDocumentStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;
}
