import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { renderProposalPdf } from '@/lib/proposalPdf';
import { logProposalEvent } from '@/lib/proposalEvents';
import type { Proposal } from '@/lib/proposalTypes';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/hub/leads/[id]/proposal/pdf
 *
 * Generates a PDF from the current proposal, uploads to Supabase Storage,
 * and updates the proposal's pdf_url field.
 *
 * Returns { pdf_url, proposal }
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  // 1. Load current proposal
  const { data: existing, error: loadErr } = await supabaseServer
    .from('proposals')
    .select('*')
    .eq('lead_id', id)
    .eq('is_current', true)
    .maybeSingle();

  if (loadErr || !existing) {
    return NextResponse.json(
      { error: 'No current proposal found.' },
      { status: 404 },
    );
  }

  const proposal = existing as unknown as Proposal;

  // 2. Render PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderProposalPdf(proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF render failed';
    console.error('[proposal/pdf] Render error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 3. Upload to Supabase Storage
  const slug = (proposal.client_company || proposal.client_name || 'proposal')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = `${slug}-v${proposal.version_number}-${Date.now()}.pdf`;
  const storagePath = `${id}/${fileName}`;

  const { error: uploadErr } = await supabaseServer.storage
    .from('proposal-pdfs')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadErr) {
    console.error('[proposal/pdf] Upload error:', uploadErr.message);
    return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // 4. Get public URL
  const { data: urlData } = supabaseServer.storage
    .from('proposal-pdfs')
    .getPublicUrl(storagePath);

  const pdfUrl = urlData.publicUrl;

  // 5. Update proposal record
  const { data: updated, error: updateErr } = await supabaseServer
    .from('proposals')
    .update({ pdf_url: pdfUrl })
    .eq('id', proposal.id)
    .select()
    .single();

  if (updateErr) {
    console.error('[proposal/pdf] Update error:', updateErr.message);
    // PDF was uploaded but record update failed — still return the URL
    return NextResponse.json({
      pdf_url: pdfUrl,
      proposal: { ...proposal, pdf_url: pdfUrl },
      warning: 'PDF generated but record update failed.',
    });
  }

  // 6. Log event
  void logProposalEvent(proposal.id, 'pdf_generated', 'Proposal PDF generated', {
    file_name: fileName,
    storage_path: storagePath,
    file_size_bytes: pdfBuffer.length,
  });

  return NextResponse.json({
    pdf_url: pdfUrl,
    proposal: updated,
  });
}
