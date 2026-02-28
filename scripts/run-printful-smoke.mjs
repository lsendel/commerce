import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import 'dotenv/config';

const apiKey = process.env.PRINTFUL_API_KEY;
if (!apiKey) {
  console.error('Missing PRINTFUL_API_KEY. Set it in env or .env before running.');
  process.exit(1);
}

const productId = process.env.PRINTFUL_PRODUCT_ID || '19';
const environment = {
  id: 'printful-smoke-env',
  name: 'Printful Smoke Env',
  values: [
    { key: 'oauth', value: apiKey, enabled: true },
    { key: 'product_id', value: productId, enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

const tmpFile = path.join(os.tmpdir(), `printful-smoke-env-${Date.now()}.json`);
fs.writeFileSync(tmpFile, JSON.stringify(environment, null, 2), 'utf8');

const collectionPath = path.resolve('docs/printful_smoke_collection.json');
const cmd = ['--yes', 'newman', 'run', collectionPath, '-e', tmpFile, '--reporters', 'cli'];

console.log(`Running Printful smoke against product_id=${productId}`);
const result = spawnSync('npx', cmd, { stdio: 'inherit' });

try {
  fs.unlinkSync(tmpFile);
} catch {
  // Ignore temp cleanup failures.
}

process.exit(result.status ?? 1);
