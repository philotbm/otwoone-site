import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';
import { OTWOONE_OS_VERSION } from '@/lib/osVersion';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/hub/projects/[id]
 *
 * Allowed updates:
 *   project_status: any ProjectStatus value
 *   maintenance_plan, maintenance_status, hosting_required
 *   reviews_included (hub-editable; reviews_used is NOT directly patchable)
 *
 * Special logic when project_status → 'complete':
 *   - Sets delivery_completed_at = now()
 *   - If hosting_required: sets maintenance_status = 'active'
 *
 * Special logic when project_status transitions INTO 'revisions':
 *   - Blocks with 409 if reviews_used >= reviews_included (review limit reached)
 *   - Otherwise auto-increments reviews_used by 1
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  // Fetch current project state
  const { data: project, error: fetchErr } = await supabaseServer
    .from('projects')
    .select('id, hosting_required, maintenance_status, project_status, reviews_used, reviews_included')
    .eq('id', id)
    .single();

  if (fetchErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  const allowedFields = [
    'project_status', 'maintenance_plan', 'maintenance_status', 'hosting_required',
    'reviews_included',
  ] as const;

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  // Delivery logic
  if (body.project_status === 'complete') {
    updates.delivery_completed_at = new Date().toISOString();

    // Activate maintenance if hosting is on
    const hostingOn =
      'hosting_required' in body
        ? Boolean(body.hosting_required)
        : project.hosting_required;

    if (hostingOn) {
      updates.maintenance_status = 'active';
    }
  }

  // Gate + auto-increment reviews_used when status transitions INTO 'revisions'
  if (
    body.project_status === 'revisions' &&
    project.project_status !== 'revisions'
  ) {
    if ((project.reviews_used ?? 0) >= (project.reviews_included ?? 2)) {
      await logProjectEvent(
        id,
        'status_changed',
        'Review limit reached — cannot enter revisions',
        {
          attempted_to: 'revisions',
          from: project.project_status,
          reviews_used: project.reviews_used,
          reviews_included: project.reviews_included,
        },
      );
      return NextResponse.json(
        { error: 'Review limit reached. Increase reviews included to continue.', version: OTWOONE_OS_VERSION },
        { status: 409 },
      );
    }
    updates.reviews_used = (project.reviews_used ?? 0) + 1;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from('projects')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log status change event if project_status was updated and actually changed
  if (
    typeof body.project_status === 'string' &&
    body.project_status !== project.project_status
  ) {
    const fromStatus = project.project_status;
    await logProjectEvent(
      id,
      'status_changed',
      `Status changed: ${fromStatus ?? 'null'} → ${body.project_status}`,
      { from: fromStatus, to: body.project_status },
    );
  }

  return NextResponse.json({ success: true });
}
