export interface IObjectStorageProvider {
  readonly name: string;
  readonly bucket: string;
  /** Build a collision-free object key for an org-owned document. */
  buildKey(
    organizationId: string,
    documentId: string,
    filename: string,
  ): string;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  presignedGetUrl(key: string, expiresSeconds?: number): Promise<string>;
}
