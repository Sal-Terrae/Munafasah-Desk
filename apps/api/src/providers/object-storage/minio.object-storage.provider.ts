import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import type { IObjectStorageProvider } from './object-storage.provider.interface';

/**
 * MinIO/S3-compatible driver. Config (env, all optional in dev):
 *   OBJECT_STORE_ENDPOINT       (default: 'localhost')
 *   OBJECT_STORE_PORT           (default: 9000)
 *   OBJECT_STORE_USE_SSL        ('true' | 'false', default: 'false')
 *   OBJECT_STORE_ACCESS_KEY     (default: 'bidready_minio')
 *   OBJECT_STORE_SECRET_KEY     (default: 'bidready_minio_dev_pw')
 *   OBJECT_STORE_BUCKET         (default: 'bidready-documents')
 *   OBJECT_STORE_REGION         (default: 'me-central-1')
 *   OBJECT_STORE_PUBLIC_HOST    optional; presigned URLs use this host.
 *
 * Migrates straight to AWS S3 by setting endpoint to s3.<region>.amazonaws.com
 * (the minio SDK speaks the S3 wire protocol). For GCS use the GCS S3
 * interop endpoint or swap this driver for a GCS-native one later.
 *
 * No-ops gracefully when the backend isn't reachable so tests and
 * bare-API smoke runs don't fail to boot.
 */
@Injectable()
export class MinioObjectStorageProvider
  implements IObjectStorageProvider, OnModuleInit
{
  readonly name = 'minio';
  private readonly log = new Logger(MinioObjectStorageProvider.name);
  readonly bucket: string;
  private readonly publicClient: MinioClient;
  private readonly internalClient: MinioClient;

  constructor() {
    const endpoint = process.env.OBJECT_STORE_ENDPOINT ?? 'localhost';
    const port = Number(process.env.OBJECT_STORE_PORT ?? 9000);
    const useSSL = (process.env.OBJECT_STORE_USE_SSL ?? 'false') === 'true';
    const accessKey = process.env.OBJECT_STORE_ACCESS_KEY ?? 'bidready_minio';
    const secretKey =
      process.env.OBJECT_STORE_SECRET_KEY ?? 'bidready_minio_dev_pw';
    const region = process.env.OBJECT_STORE_REGION ?? 'me-central-1';
    this.bucket = process.env.OBJECT_STORE_BUCKET ?? 'bidready-documents';
    this.internalClient = new MinioClient({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
      region,
    });
    const publicHost = process.env.OBJECT_STORE_PUBLIC_HOST;
    this.publicClient = publicHost
      ? new MinioClient({
          endPoint: publicHost,
          port,
          useSSL,
          accessKey,
          secretKey,
          region,
        })
      : this.internalClient;
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.internalClient.bucketExists(this.bucket);
      if (!exists) {
        await this.internalClient.makeBucket(this.bucket);
        this.log.log(`created bucket ${this.bucket}`);
      }
    } catch (err) {
      this.log.warn(
        `object store init failed (uploads will fail until reachable): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  buildKey(
    organizationId: string,
    documentId: string,
    filename: string,
  ): string {
    const safe = filename.replace(/[\\/]/g, '_');
    return `${organizationId}/${documentId}/${safe}`;
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.internalClient.putObject(this.bucket, key, body, body.length, {
      'Content-Type': contentType,
    });
  }

  async presignedGetUrl(key: string, expiresSeconds = 600): Promise<string> {
    return this.publicClient.presignedGetObject(
      this.bucket,
      key,
      expiresSeconds,
    );
  }
}
