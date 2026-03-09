import { supabaseServer } from '@/lib/supabaseServer';

export type ProjectEventType =
  | 'project_created'
  | 'sharepoint_folder_created'
  | 'sharepoint_folder_failed'
  | 'sharepoint_folder_retry'
  | 'status_changed'
  | 'portal_link_sent'
  | 'scope_saved'
  | 'scope_pack_generated'
  | 'scope_pack_failed'
  | 'client_review_approved'
  | 'client_revision_requested'
  | 'client_meeting_requested'
  | 'revision_created'
  | 'revision_updated'
  | 'execution_batch_generated';

/**
 * Append an event to the project_events audit trail.
 * Best-effort — never throws; logs to console on failure.
 */
export async function logProjectEvent(
  projectId: string,
  event_type: ProjectEventType,
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseServer
    .from('project_events')
    .insert({
      project_id: projectId,
      event_type,
      message,
      meta: meta ?? null,
    });

  if (error) {
    console.error('[projectEvents] Failed to log event:', event_type, error.message);
  }
}
