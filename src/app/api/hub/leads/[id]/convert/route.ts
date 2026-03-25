import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { createProjectFolder } from '@/lib/sharepoint';
import { OTWOONE_OS_VERSION } from '@/lib/osVersion';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/hub/leads/[id]/convert
 *
 * Deposit activation: converts an approved lead to an active project.
 * 1. Validates lead is at deposit_requested or deposit_received
 * 2. Updates lead.status → 'converted'
 * 3. Creates a project row with deposit_paid status + deposit metadata
 * 4. Triggers SharePoint folder creation (non-blocking)
 *
 * Body:
 *   hosting_required: boolean (required)
 *   maintenance_plan: 'starter_49' | 'essential' | 'growth' | 'accelerator' | 'none' (required if hosting_required)
 *   deposit_amount: number | null (optional — deposit value)
 *   deposit_reference: string | null (optional — payment reference / note)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const hosting_required   = Boolean(body.hosting_required);
  const maintenance_plan   = String(body.maintenance_plan ?? 'none') as
    'starter_49' | 'essential' | 'growth' | 'accelerator' | 'none';

  // Deposit metadata (optional)
  const deposit_amount = body.deposit_amount != null ? Number(body.deposit_amount) : null;
  const deposit_reference = typeof body.deposit_reference === 'string' && body.deposit_reference.trim()
    ? body.deposit_reference.trim()
    : null;

  // Validation: if hosting required, plan must not be 'none'
  if (hosting_required && maintenance_plan === 'none') {
    return NextResponse.json(
      { error: 'A maintenance plan is required when hosting is included.', version: OTWOONE_OS_VERSION },
      { status: 400 }
    );
  }

  // Fetch the lead to get contact/company info for folder naming
  const { data: lead, error: leadFetchErr } = await supabaseServer
    .from('leads')
    .select('id, contact_name, contact_email, company_name, status')
    .eq('id', id)
    .single();

  if (leadFetchErr || !lead) {
    return NextResponse.json({ error: 'Lead not found', version: OTWOONE_OS_VERSION }, { status: 404 });
  }

  if (lead.status === 'in_build' || lead.status === 'client_review' || lead.status === 'revisions' || lead.status === 'final_approval' || lead.status === 'full_payment_requested' || lead.status === 'complete') {
    return NextResponse.json({ error: 'Lead is already past deposit activation.', version: OTWOONE_OS_VERSION }, { status: 409 });
  }

  // Prevent duplicate activation — check if a project already exists for this lead
  const { data: existingProject } = await supabaseServer
    .from('projects')
    .select('id')
    .eq('lead_id', id)
    .limit(1)
    .maybeSingle();

  if (existingProject) {
    return NextResponse.json({ error: 'A project already exists for this lead.', version: OTWOONE_OS_VERSION }, { status: 409 });
  }

  // Gate 1: lead status must be at client_approved or deposit_requested
  const activatableStatuses = ['client_approved', 'deposit_requested'];
  if (!activatableStatuses.includes(lead.status)) {
    return NextResponse.json(
      { error: `Deposit activation requires status client_approved or deposit_requested (current: ${lead.status}).`, version: OTWOONE_OS_VERSION },
      { status: 400 }
    );
  }

  // Gate 2: verify actual proposal approval truth — prevents activation
  // if lead status was manually advanced without genuine client approval
  const { data: proposal, error: proposalErr } = await supabaseServer
    .from('proposals')
    .select('id, status, approved_at, approved_by_name')
    .eq('lead_id', id)
    .eq('is_current', true)
    .single();

  if (proposalErr || !proposal) {
    return NextResponse.json(
      { error: 'No current proposal found for this lead. Create and send a proposal before activating deposit.', version: OTWOONE_OS_VERSION },
      { status: 400 }
    );
  }

  if (!proposal.approved_at) {
    return NextResponse.json(
      { error: 'Proposal has not been approved by the client. Approval is required before deposit activation.', version: OTWOONE_OS_VERSION },
      { status: 400 }
    );
  }

  // 1. Update lead status
  const { error: statusErr } = await supabaseServer
    .from('leads')
    .update({ status: 'in_build' })
    .eq('id', id);

  if (statusErr) {
    return NextResponse.json({ error: statusErr.message, version: OTWOONE_OS_VERSION }, { status: 500 });
  }

  // 2. Create project with deposit metadata
  const { data: project, error: projectErr } = await supabaseServer
    .from('projects')
    .insert({
      lead_id:              id,
      project_status:       'deposit_paid',
      hosting_required,
      maintenance_plan:     hosting_required ? maintenance_plan : 'none',
      maintenance_status:   'pending',
      client_contact_email: lead.contact_email?.trim() || null,
      client_contact_name:  lead.contact_name?.trim()  || null,
      deposit_paid_at:      new Date().toISOString(),
      deposit_amount:       deposit_amount,
      deposit_reference:    deposit_reference,
    })
    .select('id')
    .single();

  if (projectErr) {
    console.error("Project creation failed:", projectErr);
    await supabaseServer
      .from('leads')
      .update({ status: lead.status })
      .eq('id', id);
    return NextResponse.json(
      { error: projectErr.message, details: projectErr, version: OTWOONE_OS_VERSION },
      { status: 500 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { error: "Project insert returned no row", version: OTWOONE_OS_VERSION },
      { status: 500 }
    );
  }

  // 3. v1.101.9: Seed project context from brief + proposal (only if empty)
  void (async () => {
    try {
      // Check if context already exists
      const { data: existingCtx } = await supabaseServer
        .from('project_context')
        .select('id')
        .eq('project_id', project.id)
        .maybeSingle();
      if (existingCtx) return; // already seeded

      // Fetch brief and proposal for seeding material
      const { data: brief } = await supabaseServer
        .from('lead_briefs')
        .select('project_summary, recommended_solution, timeline_estimate, budget_positioning, risks_and_unknowns, technical_research')
        .eq('lead_id', id)
        .maybeSingle();

      const { data: prop } = await supabaseServer
        .from('proposals')
        .select('executive_summary, recommended_solution, assumptions')
        .eq('lead_id', id)
        .eq('is_current', true)
        .maybeSingle();

      const businessSummary = brief?.project_summary || null;
      const projectSummary = prop?.executive_summary || prop?.recommended_solution || brief?.recommended_solution || null;

      // Extract core stack from technical research
      let currentStack: string | null = null;
      if (brief?.technical_research && typeof brief.technical_research === 'object') {
        const research = brief.technical_research as { recommendations?: string[]; summary?: string };
        if (research.recommendations?.length) {
          currentStack = research.recommendations.slice(0, 5).join('; ');
        } else if (research.summary) {
          currentStack = research.summary;
        }
      }

      // Build constraints from budget, timeline, risks
      const constraintParts: string[] = [];
      if (brief?.budget_positioning) constraintParts.push(`Budget: ${String(brief.budget_positioning).substring(0, 200)}`);
      if (brief?.timeline_estimate) constraintParts.push(`Timeline: ${String(brief.timeline_estimate).substring(0, 200)}`);
      if (brief?.risks_and_unknowns) constraintParts.push(`Risks: ${String(brief.risks_and_unknowns).substring(0, 300)}`);
      const constraints = constraintParts.length > 0 ? constraintParts.join('\n') : null;

      // AI notes from proposal assumptions
      let aiNotes: string | null = null;
      if (prop?.assumptions && Array.isArray(prop.assumptions) && prop.assumptions.length > 0) {
        aiNotes = `Key assumptions: ${(prop.assumptions as string[]).join('; ')}`;
      }

      await supabaseServer.from('project_context').insert({
        project_id: project.id,
        business_summary: businessSummary,
        project_summary: projectSummary,
        current_stack: currentStack,
        constraints,
        ai_notes: aiNotes,
      });
      console.log('[convert] Project context seeded from brief/proposal.');
    } catch (err) {
      console.error('[convert] Project context seeding failed (non-blocking):', err);
    }
  })();

  // 4. SharePoint folder creation (non-blocking — best effort)
  const clientLabel =
    lead.company_name?.trim() ||
    lead.contact_name?.trim() ||
    lead.id.slice(0, 8);

  void (async () => {
    const folderName = `${clientLabel} [${id.slice(0, 8).toUpperCase()}]`;
    const result = await createProjectFolder(folderName);

    if (result.ok) {
      await supabaseServer
        .from('projects')
        .update({ sharepoint_folder_url: result.folderUrl })
        .eq('id', project.id);
      await logProjectEvent(project.id, 'sharepoint_folder_created', 'SharePoint folder created', { folderUrl: result.folderUrl });
    } else {
      await supabaseServer
        .from('projects')
        .update({ sharepoint_folder_error: result.error })
        .eq('id', project.id);
      console.error('SharePoint folder creation failed:', result.error);
      await logProjectEvent(project.id, 'sharepoint_folder_failed', 'SharePoint folder creation failed', { error: result.error });
    }
  })();

  // Update proposal status to deposit_received (non-blocking — best effort)
  await supabaseServer
    .from('proposals')
    .update({ status: 'deposit_received', deposit_received_at: new Date().toISOString() })
    .eq('id', proposal.id);

  await logProjectEvent(
    project.id,
    'project_created',
    'Project created via deposit activation',
    {
      lead_id: id,
      proposal_id: proposal.id,
      approved_by: proposal.approved_by_name,
      deposit_amount: deposit_amount,
      deposit_reference: deposit_reference,
    },
  );

  return NextResponse.json({ success: true, project_id: project.id, version: OTWOONE_OS_VERSION });
}
