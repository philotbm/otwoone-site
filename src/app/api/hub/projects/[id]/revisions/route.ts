import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ id: string }> };

const VALID_TYPES = ['copy', 'design', 'feature', 'bug', 'other'] as const;
const VALID_STATUSES = ['queued', 'in_progress', 'complete'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const VALID_SOURCES = ['portal', 'email', 'internal'] as const;

/**
 * GET /api/hub/projects/[id]/revisions
 *
 * Hub-protected (middleware). Returns all revision items for a project,
 * ordered by created_at descending.
 *
 * Query params:
 *   status      — filter by status (queued | in_progress | complete)
 *   batch_label — filter by batch label
 *
 * Returns { revisions: RevisionItem[] }
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');
  const batchFilter = url.searchParams.get('batch_label');

  let query = supabaseServer
    .from('revision_items')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (statusFilter && (VALID_STATUSES as readonly string[]).includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }
  if (batchFilter) {
    query = query.eq('batch_label', batchFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revisions: data ?? [] });
}

/**
 * POST /api/hub/projects/[id]/revisions
 *
 * Hub-protected (middleware). Creates a new revision item.
 *
 * Body:
 *   title            — required
 *   description      — optional (defaults to '')
 *   revision_type    — optional (defaults to 'other')
 *   priority         — optional (defaults to 'medium')
 *   source           — optional (defaults to 'internal')
 *   batch_label      — optional
 *   feedback_event_id — optional (links to a project_events row)
 *
 * Returns { revision: RevisionItem }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const description = String(body.description ?? '').trim();
  const revision_type = String(body.revision_type ?? 'other');
  const priority = String(body.priority ?? 'medium');
  const source = String(body.source ?? 'internal');
  const batch_label = body.batch_label ? String(body.batch_label).trim() : null;
  const feedback_event_id = body.feedback_event_id ? String(body.feedback_event_id) : null;

  // Validate enums
  if (!(VALID_TYPES as readonly string[]).includes(revision_type)) {
    return NextResponse.json({ error: `Invalid revision_type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }
  if (!(VALID_PRIORITIES as readonly string[]).includes(priority)) {
    return NextResponse.json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 });
  }
  if (!(VALID_SOURCES as readonly string[]).includes(source)) {
    return NextResponse.json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('revision_items')
    .insert({
      project_id: id,
      feedback_event_id,
      revision_type,
      title,
      description,
      priority,
      source,
      batch_label,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void logProjectEvent(
    id,
    'revision_created',
    `Revision created: ${title}`,
    { revision_id: data.id, revision_type, priority, source },
  );

  return NextResponse.json({ revision: data }, { status: 201 });
}
