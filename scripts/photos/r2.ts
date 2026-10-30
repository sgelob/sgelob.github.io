import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface ObjectStore {
  listKeys(prefix: string): Promise<Set<string>>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
}

export type R2Env = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

/** The R2 credentials from the environment, or undefined when any of the four is missing. */
export function r2Env(env: NodeJS.ProcessEnv = process.env): R2Env | undefined {
  const { R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET: bucket } = env;
  return accountId && accessKeyId && secretAccessKey && bucket ? { accountId, accessKeyId, secretAccessKey, bucket } : undefined;
}

/** The real store from the environment; the error names the variables. */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): R2Store {
  const r2 = r2Env(env);
  if (!r2) throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET must be set (see .env.example)');
  return new R2Store(r2);
}

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

  /** Deletes in batches of 1000, the most one request takes; throws with the keys R2 refused. */
  async delete(keys: readonly string[]): Promise<void> {
    const refused: string[] = [];
    for (let i = 0; i < keys.length; i += 1000) {
      const objects = keys.slice(i, i + 1000).map((Key) => ({ Key }));
      const r = await this.client.send(new DeleteObjectsCommand({ Bucket: this.env.bucket, Delete: { Objects: objects, Quiet: true } }));
      for (const e of r?.Errors ?? []) refused.push(`${e.Key}: ${e.Message}`);
    }
    if (refused.length) throw new Error(`R2 refused to delete ${refused.length} keys:\n${refused.join('\n')}`);
  }
}
