/**
 * Server-side lead scoring engine.
 * Computes clarity, alignment, complexity, and authority scores
 * plus a discovery depth recommendation.
 *
 * Server-only — never import into client components.
 */

export interface ScoreInput {
  engagement_type: string;
  budget: string;
  timeline: string;
  decision_authority: string;
  clarifier_answers: Record<string, string>;
  success_definition: string;
}

export interface ScoreResult {
  clarity_score: number;        // 1–5
  alignment_score: number;      // 1–5
  complexity_score: number;     // 1–5
  authority_score: number;      // 1–5
  total_score: number;          // weighted average, 1 decimal
  discovery_depth_suggested: 'lite' | 'core' | 'deep';
}

const LOW_BUDGET_BANDS = ['under_3k', '3k_5k'];
const HIGH_BUDGET_BANDS = ['5k_15k', '15k_40k', '40k_plus'];
const COMPLEX_TYPES = ['build_new', 'improve_existing'];

function clamp(value: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function computeScores(input: ScoreInput): ScoreResult {
  const {
    engagement_type,
    budget,
    timeline,
    decision_authority,
    clarifier_answers,
    success_definition,
  } = input;

  // ─── clarity_score (1–5) ──────────────────────────────────────────────────
  // How complete and clear is the submission?
  let clarity = 1;
  if ((success_definition ?? '').trim().length > 30) clarity++;
  const clarifierCount = Object.keys(clarifier_answers ?? {}).length;
  if (clarifierCount >= 2) clarity++;
  if (clarifierCount >= 3) clarity++;
  if (budget && budget !== 'not_sure') clarity++;

  // ─── alignment_score (1–5) ────────────────────────────────────────────────
  // Does this look like a good-fit engagement for OTwoOne?
  let alignment = 2;
  if (HIGH_BUDGET_BANDS.includes(budget)) alignment += 2;
  else if (budget === 'not_sure') alignment += 0;
  else alignment += 0; // low budget — neutral, not penalised
  if (['asap', '1_3_months'].includes(timeline)) alignment++;

  // ─── complexity_score (1–5) ───────────────────────────────────────────────
  // How complex is the engagement likely to be?
  let complexity: number;
  if (engagement_type === 'build_new') complexity = 4;
  else if (engagement_type === 'improve_existing') complexity = 3;
  else if (engagement_type === 'branding') complexity = 3;
  else if (engagement_type === 'tech_advice') complexity = 2;
  else if (engagement_type === 'ongoing_support') complexity = 2;
  else complexity = 3; // unknown — default to medium

  // ─── authority_score (1–5) ────────────────────────────────────────────────
  // How much decision-making power does this contact have?
  const authority =
    decision_authority === 'yes' ? 5 :
    decision_authority === 'shared' ? 3 : 1;

  const c  = clamp(clarity);
  const al = clamp(alignment);
  const co = clamp(complexity);
  const au = clamp(authority);

  // Total: equal weight across four scores, scaled to 1–5
  const total = parseFloat(((c + al + co + au) / 4).toFixed(1));

  // ─── discovery_depth_suggested ────────────────────────────────────────────
  // Rules (priority order):
  //   1. Low clarity → deep
  //   2. Budget under €5k → lite
  //   3. High complexity → deep
  //   4. Otherwise → core
  let depth: 'lite' | 'core' | 'deep' = 'core';

  if (c <= 2) {
    depth = 'deep';
  } else if (LOW_BUDGET_BANDS.includes(budget)) {
    depth = 'lite';
  } else if (co >= 4 || COMPLEX_TYPES.includes(engagement_type)) {
    depth = 'deep';
  }

  return {
    clarity_score: c,
    alignment_score: al,
    complexity_score: co,
    authority_score: au,
    total_score: total,
    discovery_depth_suggested: depth,
  };
}
