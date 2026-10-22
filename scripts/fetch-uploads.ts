import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Client } from 'basic-ftp';
import { needsDownload } from './photos/files';

if (existsSync('.env')) process.loadEnvFile('.env');

const REMOTE_ROOT = '/www/wp-content/uploads';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

const localSize = (path: string): number | undefined => (existsSync(path) ? statSync(path).size : undefined);

async function connect(): Promise<Client> {
  const client = new Client(60_000);
  await client.access({ host: required('OVH_FTP_HOST'), user: required('OVH_FTP_USER'), password: required('OVH_FTP_PASS'), secure: false });
  return client;
}

async function main(): Promise<number> {
  const uploadsDir = required('UPLOADS_DIR');
  const stats = { downloaded: 0, skipped: 0, failed: 0 };
  const started = Date.now();
  let client = await connect();

  async function download(remote: string, local: string): Promise<void> {
    mkdirSync(dirname(local), { recursive: true });
    try {
      await client.downloadTo(local, remote);
    } catch {
      client.close();
      client = await connect(); // the control connection may have dropped: reconnect and retry once
      await client.downloadTo(local, remote);
    }
  }

  async function walk(remoteDir: string, relDir: string): Promise<void> {
    for (const entry of await client.list(remoteDir)) {
      if (entry.name === '.' || entry.name === '..') continue;
      const remote = `${remoteDir}/${entry.name}`;
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        await walk(remote, rel);
        continue;
      }
      const local = join(uploadsDir, rel);
      if (!needsDownload(entry.name, entry.size, localSize(local))) {
        stats.skipped++;
        continue;
      }
      try {
        await download(remote, local);
        stats.downloaded++;
        if (stats.downloaded % 100 === 0) console.log(`${stats.downloaded} downloaded`);
      } catch (error) {
        stats.failed++;
        console.error(`failed ${rel}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  try {
    await walk(REMOTE_ROOT, '');
  } finally {
    client.close();
  }
  console.log(`${stats.downloaded} downloaded, ${stats.skipped} skipped, ${stats.failed} failed, ${Math.round((Date.now() - started) / 1000)}s`);
  return stats.failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
