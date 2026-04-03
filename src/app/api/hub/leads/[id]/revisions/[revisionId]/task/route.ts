import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string; revisionId: string }> };

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/hub/leads/[id]/revisions/[revisionId]/task
 *
 * Generates a ready-to-run Claude Code prompt from a revision batch,
 * combining lead context, system analysis, technical research, and
 * the batch's execution brief into a structured task prompt.
 *
 * Input: { batch_index: number }
 * Output: { prompt: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id, revisionId } = await params;

  let body: { batch_index?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.batch_index !== 'number' || body.batch_index < 0) {
    return NextResponse.json({ error: 'batch_index is required (non-negative integer).' }, { status: 400 });
  }

  // ── Load lead ──────────────────────────────────────────────────────────────
  const { data: lead, error: leadErr } = await supabaseServer
    .from('leads')
    .select('*, lead_details (*)')
    .eq('id', id)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  // ── Load brief (system analysis + technical research) ──────────────────────
  const { data: brief } = await supabaseServer
    .from('lead_briefs')
    .select('project_summary, recommended_solution, technical_research')
    .eq('lead_id', id)
    .maybeSingle();

  // ── Load revision ──────────────────────────────────────────────────────────
  const { data: revision, error: revErr } = await supabaseServer
    .from('lead_revisions')
    .select('id, structured_output')
    .eq('id', revisionId)
    .eq('lead_id', id)
    .single();

  if (revErr || !revision) {
    return NextResponse.json({ error: 'Revision not found.' }, { status: 404 });
  }

  const structured = revision.structured_output as { batches: any[] };
  if (!structured.batches || body.batch_index >= structured.batches.length) {
    return NextResponse.json(
      { error: `batch_index ${body.batch_index} out of range (${structured.batches.length} batches).` },
      { status: 400 },
    );
  }

  const batch = structured.batches[body.batch_index];

  // ── Build prompt ───────────────────────────────────────────────────────────
  const lines: string[] = [];

  // Title
  lines.push(`# StudioFlow Execution Task — ${batch.title}`);
  lines.push('');

  // Context
  lines.push('## Context');
  const company = lead.company_name || lead.company || lead.lead_details?.company || 'Unknown';
  const contact = lead.contact_name || lead.lead_details?.contact_name || '';
  lines.push(`**Client:** ${company}${contact ? ` (${contact})` : ''}`);

  if (brief?.project_summary) {
    lines.push('');
    lines.push(`**Project summary:** ${brief.project_summary}`);
  }

  if (brief?.recommended_solution) {
    lines.push('');
    lines.push(`**Recommended solution:** ${brief.recommended_solution}`);
  }

  // Condensed technical research
  const research = brief?.technical_research as any;
  if (research) {
    const techItems: string[] = [];
    if (research.summary) techItems.push(research.summary);
    if (research.recommendations?.length) {
      techItems.push('Key recommendations: ' + research.recommendations.join('; '));
    }
    if (research.assumptions?.length) {
      techItems.push('Stack assumptions: ' + research.assumptions.join('; '));
    }
    if (techItems.length) {
      lines.push('');
      lines.push('**Technical context:**');
      techItems.forEach((t) => lines.push(`- ${t}`));
    }
  }

  // Current tools
  const tools = lead.lead_details?.current_tools;
  if (tools) {
    lines.push('');
    lines.push(`**Current tools:** ${tools}`);
  }

  lines.push('');

  // Task Scope
  lines.push('## Task Scope');
  lines.push(`**Batch:** ${batch.title}`);
  if (batch.objective) {
    lines.push(`**Objective:** ${batch.objective}`);
  }
  lines.push('');
  lines.push('**Items:**');
  (batch.items || []).forEach((item: any) => {
    lines.push(`- [${item.type}] ${item.description}`);
  });
  lines.push('');

  // Execution Guidance
  if (batch.implementation_notes) {
    lines.push('## Execution Guidance');
    lines.push(batch.implementation_notes);
    lines.push('');
  }

  // Open Questions
  const oq = batch.open_questions || [];
  if (oq.length > 0) {
    lines.push('## Open Questions');
    oq.forEach((q: string) => lines.push(`- ${q}`));
    lines.push('');
  }

  // Acceptance Criteria
  const ac = batch.acceptance_criteria || [];
  if (ac.length > 0) {
    lines.push('## Acceptance Criteria');
    ac.forEach((c: string) => lines.push(`- ${c}`));
    lines.push('');
  }

  // Constraints
  lines.push('## Constraints');
  lines.push('- Do not break existing system functionality');
  lines.push('- Follow existing StudioFlow codebase patterns and conventions');
  lines.push('- Maintain end-to-end continuity with the existing analysis and pricing pipeline');
  lines.push('- No unrelated cleanup or refactoring');
  lines.push('- Keep changes tightly scoped to this batch');
  lines.push('');

  // Required output
  lines.push('## Required OUTPUT REPORT');
  lines.push('When complete, return:');
  lines.push('### 1. Version');
  lines.push('### 2. Files changed');
  lines.push('### 3. Summary of work completed');
  lines.push('### 4. Validation steps');
  lines.push('### 5. Any risks or follow-ups');
  lines.push('');

  const prompt = lines.join('\n');

  return NextResponse.json({ prompt });
}
