# OTwoOne -- CRM cleanup script
#
# Removes the bespoke hub/proposals/portal subsystems that are no longer in
# use. After this runs, the only backend on the site is /api/elevate/submit
# (and /api/health). Lead handling moves to Cowork via the info@ inbox.
#
# Usage:
#   cd C:\Users\philj\Dubhglas\otwoone-site
#   pwsh -File scripts\cleanup-old-crm.ps1            # dry-run (default)
#   pwsh -File scripts\cleanup-old-crm.ps1 -Apply     # actually delete

param(
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

# Make sure we're in the repo root
$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot

Write-Host ""
Write-Host "OTwoOne cleanup -- $(if ($Apply) { 'APPLY mode' } else { 'DRY-RUN mode (use -Apply to delete)' })" -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot" -ForegroundColor DarkGray
Write-Host ""

# -- Paths to remove ---------------------------------------------------------

$paths = @(
    # Hub UI & API (CRM admin)
    'src\app\hub',
    'src\app\api\hub',

    # Client-facing portal
    'src\app\projects',
    'src\app\api\projects',

    # Proposal viewer + API
    'src\app\proposal',
    'src\app\api\proposal',

    # Middleware -- no /hub routes left to protect
    'src\middleware.ts',
    'src\proxy.ts',

    # Dead lib files (CRM scoring/proposal/sharepoint/supabase clients)
    'src\lib\contextQuality.ts',
    'src\lib\leadStatus.ts',
    'src\lib\osVersion.ts',
    'src\lib\projectEvents.ts',
    'src\lib\projectStatus.ts',
    'src\lib\proposalAutofill.ts',
    'src\lib\proposalEvents.ts',
    'src\lib\proposalPdf.tsx',
    'src\lib\proposalSourceAssembly.ts',
    'src\lib\proposalTypes.ts',
    'src\lib\sharepoint.ts',
    'src\lib\supabaseClient.ts',
    'src\lib\supabaseServer.ts',

    # Supabase migrations & local state (no database any more)
    'supabase',

    # Smoke / preflight / SharePoint scripts
    'scripts\smoke.mjs',
    'scripts\smoke-cleanup.mjs',
    'scripts\create-sp-lists.mjs',
    'scripts\deploy-check.mjs',
    'scripts\preflight.mjs',

    # Docs tied to the old infra
    'SMOKE.md'
)

$existing = @()
$missing = @()

foreach ($p in $paths) {
    if (Test-Path $p) {
        $existing += $p
    } else {
        $missing += $p
    }
}

Write-Host "Will remove ($($existing.Count) paths):" -ForegroundColor Yellow
foreach ($p in $existing) {
    $type = if ((Get-Item $p) -is [System.IO.DirectoryInfo]) { 'dir ' } else { 'file' }
    Write-Host "  [$type] $p"
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "Already missing (skipping):" -ForegroundColor DarkGray
    foreach ($p in $missing) {
        Write-Host "  $p" -ForegroundColor DarkGray
    }
}

Write-Host ""

if (-not $Apply) {
    Write-Host "Dry-run complete. Re-run with -Apply to actually delete." -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# -- Apply --------------------------------------------------------------------

Write-Host "Deleting..." -ForegroundColor Red
foreach ($p in $existing) {
    Remove-Item -Recurse -Force $p
    Write-Host "  removed $p" -ForegroundColor DarkGreen
}

Write-Host ""
Write-Host "Refreshing dependencies (this will rebuild node_modules to drop the unused libs)..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. npm run check                # typecheck + production build, should pass"
Write-Host "  2. npm run dev                  # http://localhost:3000 -- exercise /elevate"
Write-Host "  3. In Vercel: remove env vars NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,"
Write-Host "                SUPABASE_SERVICE_ROLE_KEY, HUB_SECRET, SHAREPOINT_*"
Write-Host "  4. Optionally: in the Supabase dashboard, delete the project (no longer needed)"
Write-Host "  5. git add -A ; git commit -m 'v0.2.0: strip CRM, email-only backend'"
Write-Host ""
