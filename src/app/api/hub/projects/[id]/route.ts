import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/hub/projects/[id]
 *
 * Allowed updates:
 *   project_status: 'project_setup_complete' | 'build_active' | 'delivered'
 *   maintenance_plan, maintenance_status, hosting_required
 *
 * Special logic when project_status → 'delivered':
 *   - Sets delivery_completed_at = now()
 *   - If hosting_required: sets maintenance_status = 'active'
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  // Fetch current project state
  const { data: project, error: fetchErr } = await supabaseServer
    .from('projects')
    .select('id, hosting_required, maintenance_status, project_status')
    .eq('id', id)
    .single();

  if (fetchErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  const allowedFields = [
    'project_status', 'maintenance_plan', 'maintenance_status', 'hosting_required',
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

  return NextResponse.json({ success: true });
}
