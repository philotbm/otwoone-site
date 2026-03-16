import { supabaseServer } from '@/lib/supabaseServer';
import type { ProposalEventType } from '@/lib/proposalTypes';

/**
 * Append an event to the proposal_events audit trail.
 * Best-effort — never throws; logs to console on failure.
 */
export async function logProposalEvent(
  proposalId: string,
  event_type: ProposalEventType,
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseServer
    .from('proposal_events')
    .insert({
      proposal_id: proposalId,
      event_type,
      message,
      meta: meta ?? null,
    });

  if (error) {
    console.error('[proposalEvents] Failed to log event:', event_type, error.message);
  }
}
