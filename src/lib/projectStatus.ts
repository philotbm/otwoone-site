/**
 * Single source of truth for project lifecycle statuses.
 * Must stay in sync with the projects_project_status_check DB constraint.
 */

export const PROJECT_STATUSES = [
  'enquiry',
  'brief_complete',
  'requirements',
  'proposal_sent',
  'deposit_paid',
  'in_build',
  'client_review',
  'revisions',
  'final_approval',
  'complete',
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];
