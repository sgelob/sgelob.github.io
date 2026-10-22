import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface ObjectStore {
  listKeys(prefix: string): Promise<Set<string>>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
}

export type R2Env = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

/** Only the part of S3Client the store uses, so tests can pass a fake. */
type Client = Pick<S3Client, 'send'>;

export class R2Store implements ObjectStore {
  private readonly client: Client;

  constructor(
    private readonly env: R2Env,
    client?: Client,
  ) {
    this.client =
      client ??
      new S3Client({
        region: 'auto',
        endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
      });
  }

  async listKeys(prefix: string): Promise<Set<string>> {
    const keys = new Set<string>();
    let token: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.env.bucket, Prefix: prefix, ContinuationToken: token }));
      for (const object of page.Contents ?? []) if (object.Key) keys.add(object.Key);
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.env.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
    );
  }
}
