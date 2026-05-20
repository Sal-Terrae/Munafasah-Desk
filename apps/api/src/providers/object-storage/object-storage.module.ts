import { Global, Module } from '@nestjs/common';
import { OBJECT_STORAGE_PROVIDER } from './object-storage.tokens';
import { MinioObjectStorageProvider } from './minio.object-storage.provider';

/**
 * Single-driver module for now (MinIO/S3-compatible). Future cloud
 * drivers (native GCS, native S3 SDK) bind to the same token via env.
 */
@Global()
@Module({
  providers: [
    MinioObjectStorageProvider,
    {
      provide: OBJECT_STORAGE_PROVIDER,
      useExisting: MinioObjectStorageProvider,
    },
  ],
  exports: [OBJECT_STORAGE_PROVIDER],
})
export class ObjectStorageModule {}
