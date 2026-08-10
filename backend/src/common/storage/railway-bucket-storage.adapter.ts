import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageConfig } from '@config/configuration';
import { StoragePort } from './storage.port';

const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Railway's bucket product speaks the S3 API, so the standard AWS SDK v3
 * client works against it unmodified — just point `endpoint` at the bucket's
 * S3-compatible URL (see backend/README.md for the exact value, set via
 * STORAGE_ENDPOINT). Buckets are private by default, so reads go through a
 * signed URL rather than a public object URL.
 *
 * Known MVP limitation: signed URLs expire after SIGNED_URL_TTL_SECONDS.
 * Listing photos rendered into HTML that's cached longer than that will need
 * a re-fetch of `getUrl()` — fine for an MVP catalog, worth revisiting
 * (e.g. a public read-only bucket policy, or a proxy/redirect endpoint) if
 * photos start being embedded in anything long-lived like emails.
 */
@Injectable()
export class RailwayBucketStorageAdapter implements StoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const storage = configService.get<StorageConfig>('storage')!;
    this.bucket = storage.bucket;
    this.client = new S3Client({
      endpoint: storage.endpoint,
      region: storage.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: storage.accessKey,
        secretAccessKey: storage.secretKey,
      },
    });
  }

  async upload(params: { key: string; body: Buffer; contentType: string }): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return params.key;
  }

  async getUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
