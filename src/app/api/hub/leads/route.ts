import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * GET /api/hub/leads
 * Returns paginated leads with join to lead_details for the hub table.
 * Protected by middleware (hub_session cookie).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 50), 100);
  const offset = Number(searchParams.get('offset') ?? 0);

  const { data, error, count } = await supabaseServer
    .from('leads')
    .select(
      `id, created_at, updated_at, source, status, contact_name, contact_email,
       company_name, engagement_type, budget, timeline,
       go_no_go, discovery_depth, discovery_depth_suggested,
       clarity_score, alignment_score, complexity_score, authority_score, total_score,
       proposed_hosting_required, proposed_maintenance_plan,
       lead_details (success_definition, internal_notes),
       projects (id, intake_status, intake_last_saved_at, project_intakes (step1, step2, completed_at))`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, limit, offset });
}
