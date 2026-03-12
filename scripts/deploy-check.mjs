#!/usr/bin/env node
/**
 * OTwoOne — Deployment Verification
 *
 * Usage:
 *   node scripts/deploy-check.mjs
 *   npm run deploy:check
 *
 * Checks:
 *   1. Latest Vercel production deployment status
 *   2. Live domain reachability (https://www.otwoone.ie)
 *   3. Autofill API route compilation (expects 401 from auth middleware)
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

const DOMAIN = 'https://www.otwoone.ie';
const TEST_ENDPOINT = `${DOMAIN}/api/hub/leads/test/brief/autofill`;

let passed = 0;
let failed = 0;

function ok(label, detail) {
  passed++;
  console.log(`  \u2713 ${label}${detail ? ` \u2014 ${detail}` : ''}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  \u2717 ${label}${detail ? ` \u2014 ${detail}` : ''}`);
}

function run(cmd, timeout = 15000) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

// ─── Resolve Vercel scope from .vercel/project.json ───────────────────────────

function getVercelScope() {
  try {
    const projectRoot = resolve(import.meta.dirname, '..');
    const config = JSON.parse(
      readFileSync(join(projectRoot, '.vercel', 'project.json'), 'utf8')
    );
    return config.orgId || null;
  } catch {
    return null;
  }
}

// ─── Check 1: Vercel deployment status ────────────────────────────────────────

console.log('\n  Deployment verification\n');

const scope = getVercelScope();
const scopeFlag = scope ? `--scope ${scope}` : '';
const vercelOut = run(`vercel ls ${scopeFlag} --prod 2>&1`, 30000);

if (vercelOut) {
  // Find lines containing the bullet status indicator and deployment URL
  const deployLines = vercelOut
    .split('\n')
    .filter(l => l.includes('\u25CF') && l.includes('otwoone-site'));

  if (deployLines.length > 0) {
    const latest = deployLines[0];
    const isReady = latest.includes('\u25CF Ready');
    const isError = latest.includes('\u25CF Error');
    const isBuild = latest.includes('\u25CF Building');

    // Extract age (first non-whitespace token on the line)
    const ageMatch = latest.match(/^\s*(\S+)/);
    const age = ageMatch ? ageMatch[1] : 'unknown';

    if (isReady) {
      ok('Vercel production', `Ready (${age} ago)`);
    } else if (isBuild) {
      fail('Vercel production', `Still building (${age})`);
    } else if (isError) {
      fail('Vercel production', `Error state (${age} ago)`);
    } else {
      fail('Vercel production', `Unknown status`);
    }
  } else {
    fail('Vercel production', 'No otwoone-site deployments found');
  }
} else {
  fail('Vercel production', 'vercel CLI not available or timed out');
}

// ─── Check 2: Domain reachability ─────────────────────────────────────────────

const curlHead = run(`curl -sI "${DOMAIN}"`);

if (curlHead) {
  const statusMatch = curlHead.match(/HTTP\/[\d.]+ (\d+)/);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : null;

  if (status === 200) {
    ok('Domain reachable', DOMAIN);
  } else if (status) {
    fail('Domain reachable', `${DOMAIN} returned HTTP ${status}`);
  } else {
    fail('Domain reachable', `${DOMAIN} \u2014 could not parse response`);
  }
} else {
  fail('Domain reachable', `${DOMAIN} \u2014 connection failed`);
}

// ─── Check 3: API route compilation ───────────────────────────────────────────

// Use native fetch via a child node process to avoid curl shell-escaping issues on Windows
const apiStatus = run(
  `node -e "fetch('${TEST_ENDPOINT}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scoping_reply:'deploy-check'})}).then(r=>process.stdout.write(String(r.status))).catch(()=>process.exit(1))"`,
  15000
);

if (apiStatus === '401') {
  ok('Autofill route compiled', `POST returned 401 (auth middleware OK)`);
} else if (apiStatus === '500' || apiStatus === '502') {
  fail('Autofill route compiled', `POST returned ${apiStatus} (route error)`);
} else if (apiStatus) {
  ok('Autofill route reachable', `POST returned ${apiStatus}`);
} else {
  fail('Autofill route compiled', 'Connection failed');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
