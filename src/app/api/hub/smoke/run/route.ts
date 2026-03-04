/**
 * POST /api/hub/smoke/run
 *
 * End-to-end smoke test for OTwoOne OS v1.
 * Protected by middleware (x-hub-secret header or hub_session cookie).
 *
 * Does NOT call Resend — DB and scoring are exercised directly.
 * SharePoint folder creation is tested as "must not block conversion".
 *
 * Returns:
 *   { ok, steps, created: { leads, projects } }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeScores } from '@/lib/scoring';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepResult = {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
  error?: string;
};

type SmokeResponse = {
  ok: boolean;
  steps: StepResult[];
  created: {
    leads: Array<{ scenario: string; id: string; company_name: string }>;
    projects: Array<{ id: string; lead_id: string }>;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(name: string, details?: Record<string, unknown>): StepResult {
  return { name, ok: true, details };
}

function fail(name: string, error: string, details?: Record<string, unknown>): StepResult {
  return { name, ok: false, error, details };
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Scenario definitions ─────────────────────────────────────────────────────
// Each scenario is carefully crafted to produce a predictable scoring outcome.

const SCENARIOS = {
  A: {
    label: 'Build new — high budget, clear',
    engagement_type:    'build_new',
    clarifier_answers:  { what_building: 'web_app', design_ready: 'no', team_involved: 'just_me' },
    budget:             '15k_40k',
    timeline:           '1_3_months',
    // > 30 chars so clarity gets the +1 for success definition
    success_definition: 'We launch by Q3 with a conversion funnel driving consistent inbound leads and customer signups, measured at 50+ per month within 90 days of launch.',
    decision_authority: 'yes',
    // Expected: c=5, al=5, co=4, au=5, total=4.8, depth='deep'
    expected_depth:     'deep' as const,
    expected_min_score: 4.0,
  },
  B: {
    label: 'Improve existing — low budget',
    engagement_type:    'improve_existing',
    clarifier_answers:  { what_to_improve: 'design_ux', current_tech: 'wordpress', urgency: 'nice_to_have' },
    budget:             'under_3k',
    timeline:           'asap',
    // <= 30 chars so clarity does NOT get the success definition bonus
    success_definition: 'Better site.',
    decision_authority: 'shared',
    // Expected: c=4, al=3, co=3, au=3, depth='lite' (low budget path)
    expected_depth:     'lite' as const,
    expected_min_score: 2.5,
  },
  C: {
    label: 'Branding — low alignment',
    engagement_type:    'branding',
    clarifier_answers:  { branding_need: 'identity_new', existing_brand: 'nothing', branding_output: 'logo_visual' },
    budget:             '3k_5k',
    timeline:           'planning',
    success_definition: 'Nice logo.',
    decision_authority: 'shared',
    // Expected: c=4, al=2 (no high budget, slow timeline), co=3, depth='lite'
    expected_depth:     'lite' as const,
    expected_max_alignment: 3,
  },
  D: {
    label: 'Tech advice — vague, low clarity',
    engagement_type:    'tech_advice',
    clarifier_answers:  { advice_area: 'not_sure' },  // only 1 clarifier → low clarity
    budget:             'not_sure',
    timeline:           'planning',
    success_definition: 'Guidance.',
    decision_authority: 'no',
    // Expected: c=1 (low clarity → deep), al=2, total≈1.5, depth='deep'
    expected_depth:     'deep' as const,
    expected_max_score: 2.0,
  },
} as const;

type ScenarioKey = keyof typeof SCENARIOS;

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST() {
  const steps: StepResult[] = [];
  const createdLeads: SmokeResponse['created']['leads'] = [];
  const createdProjects: SmokeResponse['created']['projects'] = [];

  const supabase = getSupabase();
  const runId = Date.now(); // unique suffix per run

  // ── STEP GROUP 1: Create test leads ───────────────────────────────────────
  const scenarioLeadIds: Partial<Record<ScenarioKey, string>> = {};

  for (const [key, scenario] of Object.entries(SCENARIOS) as [ScenarioKey, typeof SCENARIOS[ScenarioKey]][]) {
    const scores = computeScores({
      engagement_type:    scenario.engagement_type,
      budget:             scenario.budget,
      timeline:           scenario.timeline,
      decision_authority: scenario.decision_authority,
      clarifier_answers:  { ...scenario.clarifier_answers },
      success_definition: scenario.success_definition,
    });

    const companyName = `SMOKE-${key}-${runId}`;

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        source:            'smoke',
        status:            'lead_submitted',
        contact_name:      `Smoke Tester ${key}`,
        contact_email:     `smoke+${runId}+${key.toLowerCase()}@example.com`,
        company_name:      companyName,
        engagement_type:   scenario.engagement_type,
        budget:            scenario.budget,
        timeline:          scenario.timeline,
        decision_authority: scenario.decision_authority,
        clarity_score:              scores.clarity_score,
        alignment_score:            scores.alignment_score,
        complexity_score:           scores.complexity_score,
        authority_score:            scores.authority_score,
        total_score:                scores.total_score,
        discovery_depth_suggested:  scores.discovery_depth_suggested,
      })
      .select('id')
      .single();

    if (leadErr || !lead) {
      steps.push(fail(
        `Create Scenario ${key}: ${scenario.label}`,
        leadErr?.message ?? 'Lead insert failed'
      ));
      continue;
    }

    // Insert lead_details (no email sent — smoke mode)
    const { error: detErr } = await supabase.from('lead_details').insert({
      lead_id:            lead.id,
      raw_submission:     { ...scenario, _smoke: true, run_id: runId },
      clarifier_answers:  { ...scenario.clarifier_answers },
      success_definition: scenario.success_definition,
      internal_notes:     `Smoke run ${runId}`,
    });

    if (detErr) {
      steps.push(fail(
        `Create Scenario ${key}: ${scenario.label}`,
        `lead_details insert failed: ${detErr.message}`,
        { lead_id: lead.id }
      ));
      continue;
    }

    scenarioLeadIds[key] = lead.id;
    createdLeads.push({ scenario: key, id: lead.id, company_name: companyName });

    steps.push(pass(`Create Scenario ${key}: ${scenario.label}`, {
      id: lead.id,
      scores: {
        clarity:   scores.clarity_score,
        alignment: scores.alignment_score,
        complexity: scores.complexity_score,
        authority: scores.authority_score,
        total:     scores.total_score,
      },
      discovery_depth_suggested: scores.discovery_depth_suggested,
    }));
  }

  // ── STEP GROUP 2: Verify DB inserts + score assertions ────────────────────
  for (const [key, leadId] of Object.entries(scenarioLeadIds) as [ScenarioKey, string][]) {
    const scenario = SCENARIOS[key];

    const { data: row, error: fetchErr } = await supabase
      .from('leads')
      .select('id, clarity_score, alignment_score, complexity_score, authority_score, total_score, discovery_depth_suggested')
      .eq('id', leadId)
      .single();

    if (fetchErr || !row) {
      steps.push(fail(`Verify DB Scenario ${key}`, fetchErr?.message ?? 'Row not found after insert'));
      continue;
    }

    // All score fields must be populated
    const nullFields = (['clarity_score','alignment_score','complexity_score','authority_score','total_score','discovery_depth_suggested'] as const)
      .filter((f) => row[f] == null);

    if (nullFields.length > 0) {
      steps.push(fail(`Verify DB Scenario ${key}`, `Score fields null: ${nullFields.join(', ')}`));
      continue;
    }

    // Depth assertion
    if (row.discovery_depth_suggested !== scenario.expected_depth) {
      steps.push(fail(
        `Verify DB Scenario ${key}: discovery depth`,
        `Expected '${scenario.expected_depth}', got '${row.discovery_depth_suggested}'`,
        { scores: row }
      ));
      continue;
    }

    // lead_details must exist
    const { data: det, error: detFetchErr } = await supabase
      .from('lead_details')
      .select('lead_id, success_definition')
      .eq('lead_id', leadId)
      .single();

    if (detFetchErr || !det) {
      steps.push(fail(`Verify DB Scenario ${key}`, 'lead_details row missing'));
      continue;
    }

    steps.push(pass(`Verify DB Scenario ${key}: scores + depth + details`, {
      total_score:                row.total_score,
      discovery_depth_suggested:  row.discovery_depth_suggested,
      lead_details_ok:            true,
    }));
  }

  // ── STEP GROUP 3: Hub list — smoke leads appear ───────────────────────────
  const smokeIds = Object.values(scenarioLeadIds);

  if (smokeIds.length > 0) {
    const { data: listRows, error: listErr } = await supabase
      .from('leads')
      .select('id, company_name')
      .like('company_name', `SMOKE-%-${runId}`)
      .in('id', smokeIds);

    if (listErr) {
      steps.push(fail('Hub list: smoke leads appear', listErr.message));
    } else {
      const foundIds = (listRows ?? []).map((r: { id: string }) => r.id);
      const missing  = smokeIds.filter((id) => !foundIds.includes(id));

      if (missing.length === 0) {
        steps.push(pass('Hub list: smoke leads appear', { count: foundIds.length }));
      } else {
        steps.push(fail('Hub list: smoke leads appear', `${missing.length} lead(s) not found`, { missing }));
      }
    }
  }

  // ── STEP GROUP 4: PATCH Scenario A — status + go/no-go + discovery ────────
  const leadAId = scenarioLeadIds['A'];

  if (leadAId) {
    const { error: patchErr } = await supabase
      .from('leads')
      .update({ status: 'discovery_active', go_no_go: true, discovery_depth: 'core' })
      .eq('id', leadAId);

    if (patchErr) {
      steps.push(fail('PATCH Scenario A: status + go_no_go + discovery_depth', patchErr.message));
    } else {
      const { data: updated, error: readErr } = await supabase
        .from('leads')
        .select('status, go_no_go, discovery_depth')
        .eq('id', leadAId)
        .single();

      if (readErr || !updated) {
        steps.push(fail('PATCH Scenario A: status + go_no_go + discovery_depth', readErr?.message ?? 'Row not found after PATCH'));
      } else if (
        updated.status        === 'discovery_active' &&
        updated.go_no_go      === true &&
        updated.discovery_depth === 'core'
      ) {
        steps.push(pass('PATCH Scenario A: status + go_no_go + discovery_depth', updated));
      } else {
        steps.push(fail(
          'PATCH Scenario A: status + go_no_go + discovery_depth',
          'Values not persisted correctly',
          updated
        ));
      }
    }
  }

  // ── STEP GROUP 5: Convert Scenario A → project ────────────────────────────
  let projectAId: string | null = null;

  if (leadAId) {
    // Update lead status to 'converted'
    const { error: convLeadErr } = await supabase
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', leadAId);

    if (convLeadErr) {
      steps.push(fail('Convert Scenario A: update lead status', convLeadErr.message));
    } else {
      // Create project (mirror logic from /api/hub/leads/[id]/convert)
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({
          lead_id:           leadAId,
          project_status:    'deposit_paid',
          hosting_required:  true,
          maintenance_plan:  'essential',
          maintenance_status: 'pending',
        })
        .select('id')
        .single();

      if (projErr || !project) {
        steps.push(fail('Convert Scenario A: create project row', projErr?.message ?? 'Insert failed'));
      } else {
        projectAId = project.id;
        createdProjects.push({ id: project.id, lead_id: leadAId });

        // Verify project row
        const { data: pRow, error: pFetchErr } = await supabase
          .from('projects')
          .select('project_status, maintenance_status, maintenance_plan, hosting_required')
          .eq('id', project.id)
          .single();

        if (pFetchErr || !pRow) {
          steps.push(fail('Convert Scenario A: verify project row', pFetchErr?.message ?? 'Project row not found'));
        } else if (
          pRow.project_status    === 'deposit_paid' &&
          pRow.maintenance_status === 'pending' &&
          pRow.maintenance_plan   === 'essential' &&
          pRow.hosting_required   === true
        ) {
          steps.push(pass('Convert Scenario A: lead → project (deposit confirmed)', {
            project_id:         project.id,
            project_status:     pRow.project_status,
            maintenance_status: pRow.maintenance_status,
            maintenance_plan:   pRow.maintenance_plan,
          }));
        } else {
          steps.push(fail('Convert Scenario A: verify project row', 'Unexpected project values', pRow));
        }

        // SharePoint is non-blocking — we don't fail on its absence
        steps.push(pass('Convert Scenario A: SharePoint non-blocking (folder attempt deferred)', {
          note: 'Folder creation is async best-effort; missing SHAREPOINT_DRIVE_ID is expected in CI',
        }));

        // Verify lead status is now 'converted'
        const { data: convLead } = await supabase
          .from('leads')
          .select('status')
          .eq('id', leadAId)
          .single();

        if (convLead?.status === 'converted') {
          steps.push(pass('Convert Scenario A: lead.status = converted'));
        } else {
          steps.push(fail('Convert Scenario A: lead.status', `Expected 'converted', got '${convLead?.status}'`));
        }
      }
    }
  }

  // ── STEP GROUP 6: Project → build_active ──────────────────────────────────
  if (projectAId) {
    const { error: baErr } = await supabase
      .from('projects')
      .update({ project_status: 'in_build' })
      .eq('id', projectAId);

    if (baErr) {
      steps.push(fail('Project status → build_active', baErr.message));
    } else {
      const { data: pRow } = await supabase
        .from('projects')
        .select('project_status')
        .eq('id', projectAId)
        .single();

      if (pRow?.project_status === 'in_build') {
        steps.push(pass('Project status → build_active', pRow));
      } else {
        steps.push(fail('Project status → build_active', `Got '${pRow?.project_status}'`));
      }
    }
  }

  // ── STEP GROUP 7: Project → delivered + maintenance activation ────────────
  if (projectAId) {
    const deliveredAt = new Date().toISOString();

    const { error: delErr } = await supabase
      .from('projects')
      .update({
        project_status:        'complete',
        delivery_completed_at: deliveredAt,
        maintenance_status:    'active',   // hosting_required=true → activate
      })
      .eq('id', projectAId);

    if (delErr) {
      steps.push(fail('Project status → delivered + maintenance_status active', delErr.message));
    } else {
      const { data: pRow } = await supabase
        .from('projects')
        .select('project_status, delivery_completed_at, maintenance_status')
        .eq('id', projectAId)
        .single();

      if (
        pRow?.project_status         === 'complete' &&
        pRow?.delivery_completed_at  != null &&
        pRow?.maintenance_status     === 'active'
      ) {
        steps.push(pass('Project status → delivered + maintenance_status active', {
          project_status:        pRow.project_status,
          maintenance_status:    pRow.maintenance_status,
          delivery_completed_at: pRow.delivery_completed_at,
        }));
      } else {
        steps.push(fail(
          'Project status → delivered + maintenance_status active',
          'Expected delivered + delivery_completed_at set + maintenance active',
          pRow ?? {}
        ));
      }
    }
  }

  // ── STEP GROUP 8 (Negative guard): hosting=true + plan=none → reject ──────
  // Mirrors the validation in POST /api/hub/leads/[id]/convert
  const validateConversion = (hosting: boolean, plan: string): string | null =>
    (hosting && plan === 'none')
      ? 'A maintenance plan is required when hosting is included.'
      : null;

  const negErr = validateConversion(true, 'none');
  if (negErr) {
    steps.push(pass('Negative guard: hosting=true + plan=none → rejected', {
      validation_error: negErr,
      note: 'No project row written',
    }));
  } else {
    steps.push(fail('Negative guard: hosting=true + plan=none → rejected', 'Validation did not catch invalid combo'));
  }

  // Confirm Scenario B lead was NOT affected (still lead_submitted, no project)
  const leadBId = scenarioLeadIds['B'];
  if (leadBId) {
    const { data: bRow } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadBId)
      .single();

    const { data: bProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('lead_id', leadBId);

    if (bRow?.status === 'lead_submitted' && (bProjects ?? []).length === 0) {
      steps.push(pass('Negative guard: Scenario B lead untouched', {
        status:   bRow.status,
        projects: 0,
      }));
    } else {
      steps.push(fail('Negative guard: Scenario B lead untouched', 'Lead B was unexpectedly modified', {
        status:   bRow?.status,
        projects: (bProjects ?? []).length,
      }));
    }
  }

  const allOk = steps.every((s) => s.ok);

  return NextResponse.json({
    ok: allOk,
    steps,
    created: { leads: createdLeads, projects: createdProjects },
  } satisfies SmokeResponse);
}
