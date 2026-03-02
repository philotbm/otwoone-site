/**
 * POST /api/hub/smoke/cleanup
 *
 * Deletes all rows created by smoke runs (identified by company_name LIKE 'SMOKE-%').
 * Protected by middleware (x-hub-secret header or hub_session cookie).
 *
 * Deletion order matters:
 *   1. projects (foreign key to leads, no CASCADE)
 *   2. leads    (lead_details cascade automatically via ON DELETE CASCADE)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST() {
  const supabase = getSupabase();

  // 1. Find all smoke leads
  const { data: smokeLeads, error: findErr } = await supabase
    .from('leads')
    .select('id')
    .like('company_name', 'SMOKE-%');

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }

  const leadIds = (smokeLeads ?? []).map((l: { id: string }) => l.id);

  if (leadIds.length === 0) {
    return NextResponse.json({ deleted: { leads: 0, projects: 0 }, note: 'Nothing to clean up' });
  }

  // 2. Delete projects first (no CASCADE from projects → leads)
  const { error: projDelErr, count: projectCount } = await supabase
    .from('projects')
    .delete({ count: 'exact' })
    .in('lead_id', leadIds);

  if (projDelErr) {
    return NextResponse.json({ error: `Project delete failed: ${projDelErr.message}` }, { status: 500 });
  }

  // 3. Delete leads (lead_details cascade automatically)
  const { error: leadDelErr, count: leadCount } = await supabase
    .from('leads')
    .delete({ count: 'exact' })
    .in('id', leadIds);

  if (leadDelErr) {
    return NextResponse.json({ error: `Lead delete failed: ${leadDelErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    deleted: {
      leads:    leadCount    ?? leadIds.length,
      projects: projectCount ?? 0,
    },
  });
}
