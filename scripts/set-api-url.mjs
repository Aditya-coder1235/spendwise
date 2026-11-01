#!/usr/bin/env node
/**
 * Point the Vercel proxy at a deployed API.
 *
 * Usage:
 *   npm run set:api -- https://spendwise-api.onrender.com
 *
 * Rewrites the `/api/:path*` destination in vercel.json. The client calls
 * relative `/api/...` paths, so Vercel proxies them to the API and the auth
 * cookies stay first-party (see docs/vercel-render-atlas.md).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vercelJsonPath = path.join(rootDir, 'vercel.json');

const rawUrl = process.argv[2];

if (!rawUrl) {
  console.error('Usage: npm run set:api -- https://your-api.onrender.com');
  process.exit(1);
}

let apiUrl;
try {
  apiUrl = new URL(rawUrl);
} catch {
  console.error(`Not a valid URL: ${rawUrl}`);
  process.exit(1);
}

if (!['http:', 'https:'].includes(apiUrl.protocol)) {
  console.error(`Expected an http(s) URL, got: ${apiUrl.protocol}`);
  process.exit(1);
}

if (apiUrl.protocol !== 'https:') {
  console.warn('Warning: the API should be served over HTTPS so cookies are Secure.');
}

// A trailing slash would produce `//api/...` after the rewrite.
const destination = `${apiUrl.origin}/api/:path*`;

const config = JSON.parse(await readFile(vercelJsonPath, 'utf8'));
const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
const apiRewrite = rewrites.find((rule) => rule.source === '/api/:path*');

if (!apiRewrite) {
  console.error('vercel.json has no "/api/:path*" rewrite to update.');
  process.exit(1);
}

apiRewrite.destination = destination;

await writeFile(vercelJsonPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(`vercel.json now proxies /api/* to ${destination}`);
console.log('Next: commit and push, then redeploy on Vercel.');
