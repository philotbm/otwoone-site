import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { createProjectFolder } from '@/lib/sharepoint';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/hub/leads/[id]/convert
 *
 * Converts a lead to a project (deposit confirmed).
 * 1. Updates lead.status → 'converted'
 * 2. Creates a project row
 * 3. Triggers SharePoint folder creation (non-blocking)
 *
 * Body:
 *   hosting_required: boolean (required)
 *   maintenance_plan: 'essential' | 'growth' | 'accelerator' | 'none' (required if hosting_required)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const hosting_required   = Boolean(body.hosting_required);
  const maintenance_plan   = String(body.maintenance_plan ?? 'none') as
    'essential' | 'growth' | 'accelerator' | 'none';

  // Validation: if hosting required, plan must not be 'none'
  if (hosting_required && maintenance_plan === 'none') {
    return NextResponse.json(
      { error: 'A maintenance plan is required when hosting is included.' },
      { status: 400 }
    );
  }

  // Fetch the lead to get contact/company info for folder naming
  const { data: lead, error: leadFetchErr } = await supabaseServer
    .from('leads')
    .select('id, contact_name, company_name, status')
    .eq('id', id)
    .single();

  if (leadFetchErr || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  if (lead.status === 'converted') {
    return NextResponse.json({ error: 'Lead is already converted' }, { status: 409 });
  }

  // 1. Update lead status
  const { error: statusErr } = await supabaseServer
    .from('leads')
    .update({ status: 'converted' })
    .eq('id', id);

  if (statusErr) {
    return NextResponse.json({ error: statusErr.message }, { status: 500 });
  }

  // 2. Create project
  const { data: project, error: projectErr } = await supabaseServer
    .from('projects')
    .insert({
      lead_id:            id,
      project_status:     'project_setup_complete',
      hosting_required,
      maintenance_plan:   hosting_required ? maintenance_plan : 'none',
      maintenance_status: 'pending',
    })
    .select('id')
    .single();

  if (projectErr || !project) {
    // Rollback lead status update
    await supabaseServer.from('leads').update({ status: lead.status }).eq('id', id);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }

  // 3. SharePoint folder creation (non-blocking — best effort)
  const clientLabel =
    lead.company_name?.trim() ||
    lead.contact_name?.trim() ||
    lead.id.slice(0, 8);

  void (async () => {
    const folderName = `${clientLabel} [${id.slice(0, 8).toUpperCase()}]`;
    const result = await createProjectFolder(folderName);

    if (result.ok) {
      await supabaseServer
        .from('projects')
        .update({ sharepoint_folder_url: result.folderUrl })
        .eq('id', project.id);
    } else {
      await supabaseServer
        .from('projects')
        .update({ sharepoint_folder_error: result.error })
        .eq('id', project.id);
      console.error('SharePoint folder creation failed:', result.error);
    }
  })();

  return NextResponse.json({ success: true, project_id: project.id });
}
