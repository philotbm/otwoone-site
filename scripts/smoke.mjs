#!/usr/bin/env node
/**
 * StudioFlow v1 — Smoke Test CLI
 *
 * Usage:
 *   node scripts/smoke.mjs
 *   pnpm smoke
 *
 * Required env vars (or .env.local):
 *   SMOKE_BASE_URL  — e.g. http://localhost:3000 or https://your-branch.vercel.app
 *   HUB_SECRET      — same value as used in the hub
 *
 * Auth: uses x-hub-secret header (no cookie needed).
 * Exits non-zero if any step fails.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

// ─── Load .env.local (best effort) ────────────────────────────────────────────

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
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // File doesn't exist — that's fine
  }
}

// Try .env.local relative to cwd (project root)
loadEnvFile(join(resolve('.'), '.env.local'));
loadEnvFile(join(resolve('.'), '.env'));

// ─── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.SMOKE_BASE_URL ?? '').replace(/\/$/, '');
const SECRET   = process.env.HUB_SECRET ?? '';

if (!BASE_URL) {
  console.error('\n❌  SMOKE_BASE_URL is required.\n');
  console.error('   Set it in .env.local or as an environment variable:');
  console.error('   SMOKE_BASE_URL=http://localhost:3000 pnpm smoke\n');
  process.exit(1);
}

if (!SECRET) {
  console.error('\n❌  HUB_SECRET is required.\n');
  console.error('   Set it in .env.local or as an environment variable:');
  console.error('   HUB_SECRET=yourpassword pnpm smoke\n');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bold(str)  { return `\x1b[1m${str}\x1b[0m`; }
function green(str) { return `\x1b[32m${str}\x1b[0m`; }
function red(str)   { return `\x1b[31m${str}\x1b[0m`; }
function dim(str)   { return `\x1b[2m${str}\x1b[0m`; }
function cyan(str)  { return `\x1b[36m${str}\x1b[0m`; }
function yellow(str){ return `\x1b[33m${str}\x1b[0m`; }

// ─── Run ───────────────────────────────────────────────────────────────────────

console.log('');
console.log(bold('StudioFlow v1 — Smoke Test'));
console.log(dim(`Target: ${BASE_URL}`));
console.log('');

let res;
try {
  res = await fetch(`${BASE_URL}/api/hub/smoke/run`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-hub-secret':  SECRET,
    },
  });
} catch (err) {
  console.error(red(`❌  Network error: ${err.message}`));
  console.error(dim('   Is the server running? Check SMOKE_BASE_URL.'));
  process.exit(1);
}

if (res.status === 401) {
  console.error(red('❌  Unauthorized (401) — check HUB_SECRET'));
  process.exit(1);
}

if (!res.ok) {
  const body = await res.text().catch(() => '');
  console.error(red(`❌  HTTP ${res.status} from /api/hub/smoke/run`));
  if (body) console.error(dim(`   ${body.slice(0, 200)}`));
  process.exit(1);
}

let result;
try {
  result = await res.json();
} catch (err) {
  console.error(red(`❌  Failed to parse JSON response: ${err.message}`));
  process.exit(1);
}

// ─── Print steps ──────────────────────────────────────────────────────────────

const steps     = result.steps ?? [];
let   failCount = 0;

for (let i = 0; i < steps.length; i++) {
  const step  = steps[i];
  const num   = String(i + 1).padStart(2, ' ');
  const icon  = step.ok ? green('✓') : red('✗');
  const name  = step.ok ? step.name : bold(step.name);

  console.log(`  ${dim(num)}  ${icon}  ${name}`);

  if (!step.ok) {
    failCount++;
    if (step.error) {
      console.log(`       ${red('Error:')} ${step.error}`);
    }
  }

  if (step.details && Object.keys(step.details).length > 0 && !step.ok) {
    const pretty = JSON.stringify(step.details, null, 2)
      .split('\n')
      .map((l) => `       ${dim(l)}`)
      .join('\n');
    console.log(pretty);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('');

const passed = steps.length - failCount;

if (failCount === 0) {
  console.log(green(bold(`  ✅  All ${steps.length} steps passed`)));
} else {
  console.log(red(bold(`  ❌  ${failCount} of ${steps.length} steps failed  (${passed} passed)`)));
}

// ─── Created rows ──────────────────────────────────────────────────────────────

if (result.created) {
  const { leads = [], projects = [] } = result.created;
  console.log('');
  console.log(dim(`  Created: ${leads.length} lead(s), ${projects.length} project(s)`));
  for (const l of leads) {
    console.log(dim(`    Scenario ${l.scenario}  ${l.id}  ${l.company_name}`));
  }
  if (leads.length > 0) {
    console.log(dim(`  (Run 'pnpm smoke:cleanup' to remove test data)`));
  }
}

console.log('');
process.exit(failCount > 0 ? 1 : 0);
