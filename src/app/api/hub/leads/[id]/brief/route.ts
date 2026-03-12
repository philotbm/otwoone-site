import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

const ALLOWED_TEXT_FIELDS = [
  'scoping_reply',
  'project_summary',
  'project_type',
  'recommended_solution',
  'suggested_pages',
  'suggested_features',
  'suggested_integrations',
  'timeline_estimate',
  'budget_positioning',
  'risks_and_unknowns',
  'follow_up_questions',
  'proposal_draft',
  'contact_strategy',
] as const;

const ALLOWED_BOOL_FIELDS = [
  'override_scope_warning',
] as const;

/**
 * GET /api/hub/leads/[id]/brief
 *
 * Hub-protected (middleware). Returns the lead brief record,
 * or { brief: null } if one has not been created yet.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('lead_briefs')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brief: data });
}

/**
 * POST /api/hub/leads/[id]/brief
 *
 * Hub-protected (middleware). Creates a lead brief record if one does
 * not already exist. Idempotent — returns 200 with existing brief if present.
 *
 * Body (all optional):
 *   scoping_reply, project_summary, project_type, recommended_solution,
 *   suggested_pages, suggested_features, suggested_integrations,
 *   timeline_estimate, budget_positioning, risks_and_unknowns,
 *   follow_up_questions, proposal_draft
 *
 * Returns { brief: LeadBrief }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // empty body is fine — creates with all nulls
  }

  // Check if brief already exists
  const { data: existing } = await supabaseServer
    .from('lead_briefs')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ brief: existing });
  }

  const insert: Record<string, unknown> = { lead_id: id };
  for (const field of ALLOWED_TEXT_FIELDS) {
    if (field in body) {
      const val = String(body[field] ?? '').trim();
      insert[field] = val || null;
    }
  }
  for (const field of ALLOWED_BOOL_FIELDS) {
    if (field in body) {
      insert[field] = body[field] === true;
    }
  }

  const { data, error } = await supabaseServer
    .from('lead_briefs')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brief: data }, { status: 201 });
}

/**
 * PATCH /api/hub/leads/[id]/brief
 *
 * Hub-protected (middleware). Updates the lead brief record.
 * If no brief exists yet, creates one (upsert semantics).
 *
 * Body (all optional):
 *   scoping_reply, project_summary, project_type, recommended_solution,
 *   suggested_pages, suggested_features, suggested_integrations,
 *   timeline_estimate, budget_positioning, risks_and_unknowns,
 *   follow_up_questions, proposal_draft
 *
 * Returns { brief: LeadBrief }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const fields: Record<string, unknown> = {};
  for (const field of ALLOWED_TEXT_FIELDS) {
    if (field in body) {
      const val = typeof body[field] === 'string' ? (body[field] as string).trim() : '';
      fields[field] = val || null;
    }
  }
  for (const field of ALLOWED_BOOL_FIELDS) {
    if (field in body) {
      fields[field] = body[field] === true;
    }
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Check if brief exists
  const { data: existing } = await supabaseServer
    .from('lead_briefs')
    .select('id')
    .eq('lead_id', id)
    .maybeSingle();

  let data;
  let error;

  if (existing) {
    const result = await supabaseServer
      .from('lead_briefs')
      .update(fields)
      .eq('lead_id', id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    const result = await supabaseServer
      .from('lead_briefs')
      .insert({ lead_id: id, ...fields })
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brief: data });
}
