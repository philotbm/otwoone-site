import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ id: string; revisionId: string }> };

const VALID_TYPES = ['copy', 'design', 'feature', 'bug', 'other'] as const;
const VALID_STATUSES = ['queued', 'in_progress', 'complete'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

/**
 * PATCH /api/hub/projects/[id]/revisions/[revisionId]
 *
 * Hub-protected (middleware). Updates a revision item.
 *
 * Body (all optional):
 *   title, description, revision_type, status, priority, batch_label
 *
 * Returns { revision: RevisionItem }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, revisionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ('title' in body) {
    const title = String(body.title ?? '').trim();
    if (!title) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
    updates.title = title;
  }

  if ('description' in body) {
    updates.description = String(body.description ?? '');
  }

  if ('revision_type' in body) {
    const v = String(body.revision_type);
    if (!(VALID_TYPES as readonly string[]).includes(v)) {
      return NextResponse.json({ error: `Invalid revision_type` }, { status: 400 });
    }
    updates.revision_type = v;
  }

  if ('status' in body) {
    const v = String(body.status);
    if (!(VALID_STATUSES as readonly string[]).includes(v)) {
      return NextResponse.json({ error: `Invalid status` }, { status: 400 });
    }
    updates.status = v;
    if (v === 'complete') {
      updates.completed_at = new Date().toISOString();
    }
  }

  if ('priority' in body) {
    const v = String(body.priority);
    if (!(VALID_PRIORITIES as readonly string[]).includes(v)) {
      return NextResponse.json({ error: `Invalid priority` }, { status: 400 });
    }
    updates.priority = v;
  }

  if ('batch_label' in body) {
    updates.batch_label = body.batch_label ? String(body.batch_label).trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('revision_items')
    .update(updates)
    .eq('id', revisionId)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
  }

  void logProjectEvent(
    id,
    'revision_updated',
    `Revision updated: ${data.title}`,
    { revision_id: revisionId, updates: Object.keys(updates) },
  );

  return NextResponse.json({ revision: data });
}
