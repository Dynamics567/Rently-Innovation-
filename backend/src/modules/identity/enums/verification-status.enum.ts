export enum ProviderVerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum VerificationDocumentType {
  ID_CARD = 'id_card',
  CAC_CERTIFICATE = 'cac_certificate',
  PROOF_OF_ADDRESS = 'proof_of_address',
  LIVENESS_VIDEO = 'liveness_video',
}

export enum VerificationDocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum UserAccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum PayoutSchedule {
  WEEKLY = 'weekly',
  ON_COMPLETION = 'on_completion',
}
