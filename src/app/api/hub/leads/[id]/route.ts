import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/hub/leads/[id]
 * Returns full lead detail including lead_details and any linked project.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data: lead, error } = await supabaseServer
    .from('leads')
    .select(
      `*, lead_details (*), projects (*)`
    )
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json({ data: lead });
}

/**
 * PATCH /api/hub/leads/[id]
 * Editable fields: status (canonical lifecycle), discovery_depth,
 *                  proposed_hosting_required, proposed_maintenance_plan.
 * Also allows updating lead_details.internal_notes.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  // Fields allowed on leads table
  const leadUpdates: Record<string, unknown> = {};
  const allowedLeadFields = [
    'status', 'discovery_depth',
    'proposed_hosting_required', 'proposed_maintenance_plan',
  ] as const;

  for (const field of allowedLeadFields) {
    if (field in body) leadUpdates[field] = body[field];
  }

  if (Object.keys(leadUpdates).length > 0) {
    const { error } = await supabaseServer
      .from('leads')
      .update(leadUpdates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Internal notes live in lead_details
  if ('internal_notes' in body) {
    const { error } = await supabaseServer
      .from('lead_details')
      .update({ internal_notes: body.internal_notes })
      .eq('lead_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
