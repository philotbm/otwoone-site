#!/usr/bin/env node
/**
 * OTwoOne OS v1 — Preflight Env Check
 *
 * Usage:
 *   node scripts/preflight.mjs
 *   pnpm preflight
 *
 * Checks all required environment variables are present.
 * Prints missing NAMES only — no values are ever printed.
 * Exits non-zero if any required var is absent.
 * Warns (but does not fail) if optional vars are absent.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

// ─── Load .env.local (best effort, same pattern as smoke.mjs) ─────────────────

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
    // File not present — that's fine
  }
}

loadEnvFile(join(resolve('.'), '.env.local'));
loadEnvFile(join(resolve('.'), '.env'));

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim    = (s) => `\x1b[2m${s}\x1b[0m`;

// ─── Var lists ────────────────────────────────────────────────────────────────

/**
 * REQUIRED — the app will error at runtime without these.
 */
const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'ELEVATE_NOTIFY_EMAIL',
  'HUB_SECRET',
];

/**
 * OPTIONAL — the app degrades gracefully without these,
 * but they should be set for a complete production environment.
 */
const OPTIONAL = [
  'NEXT_PUBLIC_SITE_URL',          // used in hub email links
  'SHAREPOINT_TENANT_ID',          // SharePoint folder creation
  'SHAREPOINT_CLIENT_ID',
  'SHAREPOINT_CLIENT_SECRET',
  'SHAREPOINT_SITE_ID',
  'SHAREPOINT_DRIVE_ID',
];

// ─── Check ────────────────────────────────────────────────────────────────────

console.log('');
console.log(bold('OTwoOne OS v1 — Preflight Check'));
console.log('');

const missing  = REQUIRED.filter((k) => !process.env[k]);
const absent   = OPTIONAL.filter((k) => !process.env[k]);
const present  = REQUIRED.filter((k) =>  process.env[k]);

// Print required results
console.log(bold('Required vars:'));
for (const k of REQUIRED) {
  const ok = process.env[k];
  const icon = ok ? green('✓') : red('✗');
  // Never print the value — only show [set] or [MISSING]
  const state = ok ? dim('[set]') : red('[MISSING]');
  console.log(`  ${icon}  ${k.padEnd(38)} ${state}`);
}

// Print optional results
console.log('');
console.log(bold('Optional vars:'));
for (const k of OPTIONAL) {
  const ok = process.env[k];
  const icon = ok ? green('✓') : yellow('○');
  const state = ok ? dim('[set]') : yellow('[not set]');
  console.log(`  ${icon}  ${k.padEnd(38)} ${state}`);
}

// ─── Summary + exit ───────────────────────────────────────────────────────────

console.log('');

if (absent.length > 0) {
  console.log(yellow(`  ⚠  ${absent.length} optional var(s) not set — SharePoint folder creation and hub email links may not work.`));
}

if (missing.length > 0) {
  console.log(red(bold(`  ✗  Preflight FAILED — ${missing.length} required var(s) missing:`)));
  for (const k of missing) {
    console.log(red(`       • ${k}`));
  }
  console.log('');
  console.log(dim('  Add the missing vars to .env.local (local) or Vercel Environment Variables (preview/prod).'));
  console.log('');
  process.exit(1);
}

console.log(green(bold(`  ✓  Preflight passed — all ${present.length} required vars are set.`)));
console.log('');
process.exit(0);
