import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { createProjectFolder } from '@/lib/sharepoint';
import { OTWOONE_OS_VERSION } from '@/lib/osVersion';
import { logProjectEvent } from '@/lib/projectEvents';

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
 *   maintenance_plan: 'starter_49' | 'essential' | 'growth' | 'accelerator' | 'none' (required if hosting_required)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const hosting_required   = Boolean(body.hosting_required);
  const maintenance_plan   = String(body.maintenance_plan ?? 'none') as
    'starter_49' | 'essential' | 'growth' | 'accelerator' | 'none';

  // Validation: if hosting required, plan must not be 'none'
  if (hosting_required && maintenance_plan === 'none') {
    return NextResponse.json(
      { error: 'A maintenance plan is required when hosting is included.', version: OTWOONE_OS_VERSION },
      { status: 400 }
    );
  }

  // Fetch the lead to get contact/company info for folder naming
  const { data: lead, error: leadFetchErr } = await supabaseServer
    .from('leads')
    .select('id, contact_name, contact_email, company_name, status')
    .eq('id', id)
    .single();

  if (leadFetchErr || !lead) {
    return NextResponse.json({ error: 'Lead not found', version: OTWOONE_OS_VERSION }, { status: 404 });
  }

  if (lead.status === 'converted') {
    return NextResponse.json({ error: 'Lead is already converted', version: OTWOONE_OS_VERSION }, { status: 409 });
  }

  // 1. Update lead status
  const { error: statusErr } = await supabaseServer
    .from('leads')
    .update({ status: 'converted' })
    .eq('id', id);

  if (statusErr) {
    return NextResponse.json({ error: statusErr.message, version: OTWOONE_OS_VERSION }, { status: 500 });
  }

  // 2. Create project
  const { data: project, error: projectErr } = await supabaseServer
    .from('projects')
    .insert({
      lead_id:              id,
      project_status:       'deposit_paid',
      hosting_required,
      maintenance_plan:     hosting_required ? maintenance_plan : 'none',
      maintenance_status:   'pending',
      client_contact_email: lead.contact_email?.trim() || null,
      client_contact_name:  lead.contact_name?.trim()  || null,
    })
    .select('id')
    .single();

  if (projectErr) {
    console.error("Project creation failed:", projectErr);
    await supabaseServer
      .from('leads')
      .update({ status: lead.status })
      .eq('id', id);
    return NextResponse.json(
      { error: projectErr.message, details: projectErr, version: OTWOONE_OS_VERSION },
      { status: 500 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { error: "Project insert returned no row", version: OTWOONE_OS_VERSION },
      { status: 500 }
    );
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
      await logProjectEvent(project.id, 'sharepoint_folder_created', 'SharePoint folder created', { folderUrl: result.folderUrl });
    } else {
      await supabaseServer
        .from('projects')
        .update({ sharepoint_folder_error: result.error })
        .eq('id', project.id);
      console.error('SharePoint folder creation failed:', result.error);
      await logProjectEvent(project.id, 'sharepoint_folder_failed', 'SharePoint folder creation failed', { error: result.error });
    }
  })();

  await logProjectEvent(
    project.id,
    'project_created',
    'Project created from lead conversion',
    { lead_id: id },
  );

  return NextResponse.json({ success: true, project_id: project.id, version: OTWOONE_OS_VERSION });
}
