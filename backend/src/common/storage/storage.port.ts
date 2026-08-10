export const STORAGE_PORT = Symbol('STORAGE_PORT');

/**
 * Port/adapter boundary for object storage — same shape as SmsSender in
 * modules/identity/services/sms-sender.port.ts and the PaymentProviderPort
 * described in docs/ARCHITECTURE.md. CatalogModule (listing photos) and,
 * later, Identity (verification documents) depend on this interface, never
 * on an S3 SDK directly, so the underlying provider can change without
 * touching business logic.
 */
export interface StoragePort {
  /** Uploads a buffer and returns the storage key to persist on the entity. */
  upload(params: { key: string; body: Buffer; contentType: string }): Promise<string>;

  /** Public/signed URL a client can load the object from. */
  getUrl(key: string): Promise<string>;

  delete(key: string): Promise<void>;
}
