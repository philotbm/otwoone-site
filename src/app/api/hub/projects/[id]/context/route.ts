import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ id: string }> };

const ALLOWED_FIELDS = [
  'business_summary',
  'project_summary',
  'current_stack',
  'key_urls',
  'constraints',
  'ai_notes',
  'acceptance_notes',
] as const;

/**
 * GET /api/hub/projects/[id]/context
 *
 * Hub-protected (middleware). Returns the project context record,
 * or { context: null } if one has not been created yet.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('project_context')
    .select('*')
    .eq('project_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ context: data });
}

/**
 * POST /api/hub/projects/[id]/context
 *
 * Hub-protected (middleware). Creates a project context record if one does
 * not already exist. Idempotent — returns 200 with existing context if present.
 *
 * Body (all optional):
 *   business_summary, project_summary, current_stack, key_urls,
 *   constraints, ai_notes, acceptance_notes
 *
 * Returns { context: ProjectContext }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // empty body is fine — creates with all nulls
  }

  // Check if context already exists
  const { data: existing } = await supabaseServer
    .from('project_context')
    .select('*')
    .eq('project_id', id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ context: existing });
  }

  const insert: Record<string, unknown> = { project_id: id };
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      const val = String(body[field] ?? '').trim();
      insert[field] = val || null;
    }
  }

  const { data, error } = await supabaseServer
    .from('project_context')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void logProjectEvent(
    id,
    'project_context_created',
    'Project context created',
    { fields: Object.keys(insert).filter(k => k !== 'project_id') },
  );

  return NextResponse.json({ context: data }, { status: 201 });
}

/**
 * PATCH /api/hub/projects/[id]/context
 *
 * Hub-protected (middleware). Updates the project context record.
 * If no context exists yet, creates one (upsert semantics).
 *
 * Body (all optional):
 *   business_summary, project_summary, current_stack, key_urls,
 *   constraints, ai_notes, acceptance_notes
 *
 * Returns { context: ProjectContext }
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
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      const val = typeof body[field] === 'string' ? (body[field] as string).trim() : '';
      fields[field] = val || null;
    }
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Check if context exists
  const { data: existing } = await supabaseServer
    .from('project_context')
    .select('id')
    .eq('project_id', id)
    .maybeSingle();

  let data;
  let error;
  let isNew = false;

  if (existing) {
    const result = await supabaseServer
      .from('project_context')
      .update(fields)
      .eq('project_id', id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    isNew = true;
    const result = await supabaseServer
      .from('project_context')
      .insert({ project_id: id, ...fields })
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void logProjectEvent(
    id,
    isNew ? 'project_context_created' : 'project_context_updated',
    isNew ? 'Project context created' : 'Project context updated',
    { fields: Object.keys(fields) },
  );

  return NextResponse.json({ context: data });
}
