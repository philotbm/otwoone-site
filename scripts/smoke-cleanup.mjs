#!/usr/bin/env node
/**
 * StudioFlow v1 — Smoke Test Cleanup
 *
 * Deletes all rows with company_name LIKE 'SMOKE-%'.
 *
 * Usage:
 *   node scripts/smoke-cleanup.mjs
 *   pnpm smoke:cleanup
 *
 * Required env vars (or .env.local):
 *   SMOKE_BASE_URL
 *   HUB_SECRET
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {}
}

loadEnvFile(join(resolve('.'), '.env.local'));
loadEnvFile(join(resolve('.'), '.env'));

const BASE_URL = (process.env.SMOKE_BASE_URL ?? '').replace(/\/$/, '');
const SECRET   = process.env.HUB_SECRET ?? '';

if (!BASE_URL || !SECRET) {
  console.error('❌  SMOKE_BASE_URL and HUB_SECRET are required.');
  process.exit(1);
}

function bold(s)  { return `\x1b[1m${s}\x1b[0m`; }
function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function red(s)   { return `\x1b[31m${s}\x1b[0m`; }
function dim(s)   { return `\x1b[2m${s}\x1b[0m`; }

console.log('\nStudioFlow v1 — Smoke Cleanup');
console.log(dim(`Target: ${BASE_URL}\n`));

let res;
try {
  res = await fetch(`${BASE_URL}/api/hub/smoke/cleanup`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-secret': SECRET },
  });
} catch (err) {
  console.error(red(`❌  Network error: ${err.message}`));
  process.exit(1);
}

if (!res.ok) {
  console.error(red(`❌  HTTP ${res.status}`));
  process.exit(1);
}

const result = await res.json();

if (result.error) {
  console.error(red(`❌  ${result.error}`));
  process.exit(1);
}

if (result.note) {
  console.log(dim(`  ${result.note}`));
} else {
  console.log(green(bold(`  ✅  Deleted ${result.deleted?.leads ?? 0} lead(s) and ${result.deleted?.projects ?? 0} project(s)`)));
}
console.log('');
