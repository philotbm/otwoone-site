# OTwoOne -- v0.3.0 ship script (fixed: string-level edits, explicit UTF-8)
#
# Creates the resend-webhook feature branch off the current HEAD, applies
# all five file changes, runs npm install + npm run check, and pushes.
# Stashes the working tree before branching and pops after pushing.
#
# Prereqs: run from the repo root, on cleanup-crm-strip-out or main.
#
# Usage:
#   cd C:\Users\philj\Dubhglas\otwoone-site
#   powershell.exe -ExecutionPolicy Bypass -File scripts\ship-v0.3.0.ps1
#
# Windows PowerShell 5.1 compatible, ASCII-only.

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot

Write-Host ""
Write-Host "OTwoOne v0.3.0 ship -- Resend webhook" -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot" -ForegroundColor DarkGray
Write-Host ""

$origBranch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Starting branch: $origBranch" -ForegroundColor DarkGray

if ($origBranch -eq 'resend-webhook') {
    Write-Host "Already on resend-webhook. Aborting -- rerun on cleanup-crm-strip-out or main." -ForegroundColor Red
    exit 1
}

# Delete stale resend-webhook branch if it exists from a previous failed run
$existingBranch = git rev-parse --verify --quiet refs/heads/resend-webhook 2>$null
if ($existingBranch) {
    Write-Host "Removing stale resend-webhook branch from previous run..." -ForegroundColor DarkGray
    git branch -D resend-webhook | Out-Null
}

$dirty = (git status --porcelain) -ne $null
$stashed = $false
if ($dirty) {
    Write-Host "Stashing working tree..." -ForegroundColor DarkGray
    git stash push -u -m "ship-v0.3.0 working-tree noise"
    if ($LASTEXITCODE -ne 0) { throw "git stash failed" }
    $stashed = $true
}

try {
    Write-Host "Creating resend-webhook branch..." -ForegroundColor Cyan
    git checkout -b resend-webhook
    if ($LASTEXITCODE -ne 0) { throw "git checkout -b failed" }

    # ── 1. Write webhook route ──────────────────────────────────────────────

    Write-Host "Writing src/app/api/resend/webhook/route.ts..." -ForegroundColor Cyan
    $routeDir = "src\app\api\resend\webhook"
    if (-not (Test-Path $routeDir)) { New-Item -ItemType Directory -Force -Path $routeDir | Out-Null }

    $routeContent = @'
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { Webhook } from 'svix';

const INTERESTING_EVENTS = new Set([
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
]);

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    [k: string]: unknown;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const resendKey     = process.env.RESEND_API_KEY;
  const notifyEmail   = process.env.ELEVATE_NOTIFY_EMAIL;

  if (!webhookSecret) {
    console.error('RESEND_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await req.text();

  const svixId        = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
  }

  let event: ResendEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendEvent;
  } catch (err) {
    console.warn('Resend webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!INTERESTING_EVENTS.has(event.type)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const recipient = event.data?.to?.[0] ?? 'unknown';
  const subject   = event.data?.subject ?? '';

  if (notifyEmail && recipient === notifyEmail) {
    return NextResponse.json({ ok: true, internal: true });
  }

  if (!resendKey || !notifyEmail) {
    console.warn('Webhook received but RESEND_API_KEY or ELEVATE_NOTIFY_EMAIL missing');
    return NextResponse.json({ ok: true, no_forward: true });
  }

  const action  = event.type.replace('email.', '');
  const emailId = event.data?.email_id ?? '';
  const stamp   = event.created_at ?? new Date().toISOString();

  const fwd = new Resend(resendKey);
  try {
    await fwd.emails.send({
      from:    'OTwoOne <noreply@otwoone.ie>',
      to:      [notifyEmail],
      subject: `Engagement | ${action} | ${recipient} | ${subject}`,
      html: `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0a0b0f;color:#e5e7eb;padding:24px;">
  <table cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#13141a;border-radius:8px;padding:24px;">
    <tr><td>
      <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6366f1;">Engagement event</p>
      <h2 style="margin:6px 0 16px;font-size:18px;color:#f9fafb;">${escapeHtml(action)} - ${escapeHtml(recipient)}</h2>
      <table cellpadding="6" cellspacing="0" style="font-size:13px;color:#d1d5db;">
        <tr><td style="color:#9ca3af;width:120px;">Event</td><td>${escapeHtml(event.type)}</td></tr>
        <tr><td style="color:#9ca3af;">Recipient</td><td>${escapeHtml(recipient)}</td></tr>
        <tr><td style="color:#9ca3af;">Original subject</td><td>${escapeHtml(subject)}</td></tr>
        <tr><td style="color:#9ca3af;">Email ID</td><td style="font-family:monospace;font-size:11px;">${escapeHtml(emailId)}</td></tr>
        <tr><td style="color:#9ca3af;">Time</td><td>${escapeHtml(stamp)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    });
  } catch (err) {
    console.error('Engagement forward failed:', err);
    return NextResponse.json({ ok: true, forward_failed: true });
  }

  return NextResponse.json({ ok: true });
}
'@
    Set-Content -Path (Join-Path $routeDir "route.ts") -Value $routeContent -Encoding UTF8

    # ── 2. package.json -- add svix dep (string-level, preserves format) ────

    Write-Host "Updating package.json (literal string replace)..." -ForegroundColor Cyan
    $pkg = Get-Content "package.json" -Raw -Encoding UTF8
    if ($pkg -notmatch '"svix"') {
        # The original line in deps is the last entry (no trailing comma):
        #     "resend": "^6.9.2"
        # We need to add a comma and append the svix entry on the next line.
        $oldLine = '"resend": "^6.9.2"'
        $newBlock = "`"resend`": `"^6.9.2`",`n    `"svix`": `"^1.45.0`""
        if ($pkg.Contains($oldLine)) {
            $pkg = $pkg.Replace($oldLine, $newBlock)
        } else {
            throw "Could not find resend dep line in package.json -- aborting"
        }
        Set-Content "package.json" -Value $pkg -Encoding UTF8 -NoNewline
    }

    # ── 3. .env.example -- rewrite ASCII-only ───────────────────────────────

    Write-Host "Rewriting .env.example (ASCII-only)..." -ForegroundColor Cyan
    $envExample = @'
# Required - Resend
RESEND_API_KEY=re_...

# Required - where new Elevate notifications land
ELEVATE_NOTIFY_EMAIL=info@otwoone.ie

# Required - used in absolute URLs and OG metadata
NEXT_PUBLIC_SITE_URL=https://www.otwoone.ie

# Required - Resend webhook signing secret (Pro plan, set in Resend dashboard)
RESEND_WEBHOOK_SECRET=whsec_...
'@
    Set-Content ".env.example" -Value $envExample -Encoding UTF8

    # ── 4. DEPLOY.md -- string-level insert + append ────────────────────────

    Write-Host "Updating DEPLOY.md (string-level)..." -ForegroundColor Cyan
    $deploy = Get-Content "DEPLOY.md" -Raw -Encoding UTF8
    if ($deploy -notmatch 'RESEND_WEBHOOK_SECRET') {
        # Insert new env-var row after the NEXT_PUBLIC_SITE_URL row using IndexOf
        $sentinel = '`NEXT_PUBLIC_SITE_URL`'
        $idx = $deploy.IndexOf($sentinel)
        if ($idx -ge 0) {
            # Find the newline at end of that row
            $eol = $deploy.IndexOf("`n", $idx)
            if ($eol -ge 0) {
                $newRow = "| ``RESEND_WEBHOOK_SECRET`` | Signing secret for the Resend webhook (Pro plan). Set in Resend dashboard. |`n"
                $deploy = $deploy.Substring(0, $eol + 1) + $newRow + $deploy.Substring($eol + 1)
            }
        }
        # Append webhook setup section
        $webhookSection = @'

## Webhook setup (one-off, after first deploy)

1. In the Resend dashboard, go to Webhooks -> Add Endpoint.
2. Endpoint URL: `https://www.otwoone.ie/api/resend/webhook` (use the preview URL when testing).
3. Subscribe to events: `email.opened`, `email.clicked`, `email.bounced`, `email.complained`. Leave the others off -- they are noise at our volume.
4. Copy the signing secret (`whsec_...`) into Vercel as `RESEND_WEBHOOK_SECRET` (both Preview and Production envs) and into local `.env.local`.
5. From the Resend webhook detail page, send a test event. Confirm it returns `200` and an `Engagement | ...` email lands at `info@otwoone.ie`.
'@
        $deploy = $deploy.TrimEnd() + "`n" + $webhookSection + "`n"
        Set-Content "DEPLOY.md" -Value $deploy -Encoding UTF8
    }

    # ── 5. CHANGELOG.md -- prepend v0.3.0 entry ─────────────────────────────

    Write-Host "Updating CHANGELOG.md..." -ForegroundColor Cyan
    $changelog = Get-Content "CHANGELOG.md" -Raw -Encoding UTF8
    if ($changelog -notmatch '## v0\.3\.0') {
        $newEntry = @'
# OTwoOne Site Changelog

## v0.3.0 - 2026-05-14 - Lead engagement webhook

Resend Pro webhook integration. When a lead opens or clicks the autoresponder
(or it bounces / is marked as spam), a small "Engagement" notification email is
forwarded to info@otwoone.ie so Cowork's morning sweep picks up the signal in
the daily digest.

**Added**
- `POST /api/resend/webhook` - Svix-signed Resend webhook handler. Verifies
  signatures, filters to triage-relevant events (opened, clicked, bounced,
  complained), forwards a structured "Engagement" email to ELEVATE_NOTIFY_EMAIL.
- `RESEND_WEBHOOK_SECRET` env var (set in Resend dashboard, paste into Vercel).
- `svix` npm dependency for HMAC signature verification.

**Changed**
- `.env.example` rewritten ASCII-only and adds the new env var.
- `DEPLOY.md` adds the env var row and a webhook setup section.

**Notes**
- No new database or storage. Engagement events flow through the same
  inbox-as-system-of-record pattern as the rest of the site.
- Events received from emails sent *to* info@otwoone.ie (the internal lead
  notifications) are ignored -- we only track engagement with replies sent
  *to leads*.

---

'@
        # Replace the existing title line + blank line with the new entry
        $changelog = $changelog -replace "^# OTwoOne Site Changelog\r?\n\r?\n", ''
        $changelog = $newEntry + $changelog
        Set-Content "CHANGELOG.md" -Value $changelog -Encoding UTF8
    }

    # ── 6. npm install + check ──────────────────────────────────────────────

    Write-Host "Running npm install..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

    Write-Host "Running npm run check..." -ForegroundColor Cyan
    npm run check
    if ($LASTEXITCODE -ne 0) { throw "npm run check failed" }

    # ── 7. Stage specific files ─────────────────────────────────────────────

    Write-Host "Staging v0.3.0 files..." -ForegroundColor Cyan
    git add `
        src/app/api/resend/webhook/route.ts `
        package.json `
        package-lock.json `
        .env.example `
        DEPLOY.md `
        CHANGELOG.md
    if ($LASTEXITCODE -ne 0) { throw "git add failed" }

    Write-Host ""
    Write-Host "Staged set:" -ForegroundColor DarkGray
    git diff --cached --stat
    Write-Host ""

    # ── 8. Commit + push ────────────────────────────────────────────────────

    $commitMsg = @"
v0.3.0: Resend webhook for lead engagement tracking

- Add POST /api/resend/webhook (Svix-signed, forwards opened/clicked/bounced/complained to info@)
- Add svix dependency
- Add RESEND_WEBHOOK_SECRET env var
- Update DEPLOY.md with webhook setup steps
- Rewrite .env.example ASCII-only
"@

    Write-Host "Committing..." -ForegroundColor Cyan
    git commit -m $commitMsg
    if ($LASTEXITCODE -ne 0) { throw "git commit failed" }

    Write-Host "Pushing to origin..." -ForegroundColor Cyan
    git push -u origin resend-webhook
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }

    Write-Host ""
    Write-Host "v0.3.0 pushed." -ForegroundColor Green
    Write-Host ""
    Write-Host "PR creation: https://github.com/philotbm/otwoone-site/pull/new/resend-webhook" -ForegroundColor Cyan
    Write-Host ""

} finally {
    Write-Host "Restoring branch: $origBranch" -ForegroundColor DarkGray
    git checkout $origBranch | Out-Null

    if ($stashed) {
        Write-Host "Popping stash..." -ForegroundColor DarkGray
        git stash pop | Out-Null
    }

    Write-Host ""
    Write-Host "Done. You're back on $origBranch with your working tree intact." -ForegroundColor Green
    Write-Host ""
}
