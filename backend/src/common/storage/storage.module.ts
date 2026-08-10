import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { STORAGE_PORT } from './storage.port';
import { RailwayBucketStorageAdapter } from './railway-bucket-storage.adapter';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: STORAGE_PORT, useClass: RailwayBucketStorageAdapter }],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
