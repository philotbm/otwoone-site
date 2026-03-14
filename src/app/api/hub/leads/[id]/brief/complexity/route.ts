import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

// ── Complexity signal definitions (0–100 model) ─────────────────────────────

type SignalKey =
  | 'booking_system'
  | 'external_api_integrations'
  | 'real_time_data'
  | 'staff_dashboard'
  | 'custom_business_logic'
  | 'payments'
  | 'notifications'
  | 'analytics_reporting'
  | 'authentication_roles'
  | 'infrastructure_deployment_complexity'
  | 'customer_portal'
  | 'document_upload'
  | 'workflow_states'
  | 'multi_step_forms';

type ComplexityClass =
  | 'brochure_site'
  | 'dynamic_website'
  | 'web_application'
  | 'system_platform'
  | 'operational_platform';

type BuildComponent = {
  key: string;
  label: string;
  days_low: number;
  days_high: number;
};

type DetectedSignal = {
  key: SignalKey;
  weight: number;
  evidence: string;
};

type ComplexityResult = {
  complexity_score: number;
  complexity_class: ComplexityClass;
  detected_signals: DetectedSignal[];
  build_components: BuildComponent[];
  estimated_days_low: number;
  estimated_days_high: number;
  complexity_rationale: string;
  upstream_sources_used: string[];
};

// ── Signal weights (fixed, deterministic) ────────────────────────────────────

const SIGNAL_WEIGHTS: Record<SignalKey, number> = {
  booking_system: 20,
  external_api_integrations: 15,
  real_time_data: 10,
  staff_dashboard: 10,
  custom_business_logic: 15,
  payments: 10,
  notifications: 5,
  analytics_reporting: 5,
  authentication_roles: 5,
  infrastructure_deployment_complexity: 5,
  customer_portal: 12,
  document_upload: 8,
  workflow_states: 10,
  multi_step_forms: 8,
};

// ── Build component effort mapping ───────────────────────────────────────────

const BUILD_COMPONENTS: Record<string, { label: string; days_low: number; days_high: number }> = {
  discovery_architecture: { label: 'Discovery & architecture', days_low: 2, days_high: 3 },
  authentication: { label: 'Authentication & roles', days_low: 2, days_high: 3 },
  booking_system: { label: 'Booking system', days_low: 6, days_high: 8 },
  dashboard: { label: 'Dashboard', days_low: 4, days_high: 6 },
  api_integration: { label: 'API integration', days_low: 3, days_high: 5 },
  custom_logic: { label: 'Custom business logic', days_low: 4, days_high: 6 },
  payments: { label: 'Payments', days_low: 2, days_high: 4 },
  notifications: { label: 'Notifications', days_low: 2, days_high: 3 },
  analytics: { label: 'Analytics & reporting', days_low: 2, days_high: 3 },
  testing_qa: { label: 'Testing & QA', days_low: 2, days_high: 3 },
  deployment_launch: { label: 'Deployment & launch', days_low: 2, days_high: 3 },
  customer_portal: { label: 'Customer portal', days_low: 4, days_high: 6 },
  document_upload: { label: 'Document upload & storage', days_low: 2, days_high: 4 },
  workflow_management: { label: 'Workflow & status management', days_low: 3, days_high: 5 },
  multi_step_forms: { label: 'Multi-step forms', days_low: 2, days_high: 4 },
};

// ── Complexity class mapping ─────────────────────────────────────────────────

function classifyComplexity(score: number): ComplexityClass {
  if (score <= 20) return 'brochure_site';
  if (score <= 40) return 'dynamic_website';
  if (score <= 60) return 'web_application';
  if (score <= 80) return 'system_platform';
  return 'operational_platform';
}

// ── Signal detection patterns ────────────────────────────────────────────────
// Each signal has patterns to match against structured upstream outputs.
// Detection uses evidence from research, brief, and scoring — not raw re-analysis.

const SIGNAL_PATTERNS: Record<SignalKey, { patterns: RegExp; evidenceLabel: string }> = {
  booking_system: {
    patterns: /\b(booking|reservation|appointment|scheduling|slot.?allocat|calendar.?system|capacity.?manag|availability.?check|time.?slot)\b/i,
    evidenceLabel: 'booking/scheduling system',
  },
  external_api_integrations: {
    patterns: /\b(api.?integrat|third.?party.?api|external.?api|rest.?api|webhook|flightaware|google.?maps.?api|weather.?api|data.?feed|external.?data|import.?from|connect.?to.?external|zapier|hubspot|salesforce|xero|quickbooks)\b/i,
    evidenceLabel: 'external API integration',
  },
  real_time_data: {
    patterns: /\b(real.?time|live.?data|live.?feed|live.?update|websocket|server.?sent|polling|streaming|live.?status|live.?tracking|live.?availability|push.?notification|instant.?update)\b/i,
    evidenceLabel: 'real-time data requirement',
  },
  staff_dashboard: {
    patterns: /\b(staff.?dashboard|admin.?dashboard|admin.?panel|management.?panel|operator.?view|staff.?interface|back.?office|internal.?dashboard|management.?dashboard|ops.?dashboard|control.?panel)\b/i,
    evidenceLabel: 'staff/admin dashboard',
  },
  custom_business_logic: {
    patterns: /\b(custom.?logic|business.?rules|allocation.?logic|pricing.?logic|capacity.?logic|workflow.?engine|rule.?engine|custom.?calculation|dynamic.?pricing|tiered.?pricing|conditional.?logic|business.?workflow|automated.?workflow|custom.?algorithm|scoring.?system)\b/i,
    evidenceLabel: 'custom business logic',
  },
  payments: {
    patterns: /\b(payment|stripe|paypal|checkout|billing|invoice|subscription|recurring.?payment|deposit|refund|payment.?gateway|transaction|e.?commerce.?checkout)\b/i,
    evidenceLabel: 'payment processing',
  },
  notifications: {
    patterns: /\b(notification|email.?alert|sms.?alert|push.?notif|reminder|automated.?email|confirmation.?email|alert.?system|sendgrid|twilio|mailgun|notification.?system)\b/i,
    evidenceLabel: 'notification system',
  },
  analytics_reporting: {
    patterns: /\b(analytics|reporting|dashboard.?report|usage.?report|occupancy.?report|revenue.?report|conversion.?track|data.?visualis|chart|metric|kpi|business.?intelligence)\b/i,
    evidenceLabel: 'analytics/reporting',
  },
  authentication_roles: {
    patterns: /\b(authentication|auth|login|user.?role|role.?based|rbac|permission|access.?control|staff.?access|admin.?access|oauth|sso|multi.?tenant|user.?account)\b/i,
    evidenceLabel: 'authentication & roles',
  },
  infrastructure_deployment_complexity: {
    patterns: /\b(ci.?cd|docker|kubernetes|staging.?environment|production.?deploy|database.?migration|cdn|load.?balanc|scaling|microservice|serverless|edge.?function|cron.?job|background.?job|queue|redis|caching.?layer)\b/i,
    evidenceLabel: 'infrastructure complexity',
  },
  customer_portal: {
    patterns: /\b(customer.?portal|client.?portal|user.?portal|self.?service.?portal|customer.?facing.?portal|customer.?account|client.?account|my.?account|customer.?interface|client.?interface|customer.?area|client.?area|customer.?dashboard|client.?dashboard|online.?portal|service.?portal|member.?portal|patient.?portal)\b/i,
    evidenceLabel: 'customer portal',
  },
  document_upload: {
    patterns: /\b(document.?upload|file.?upload|upload.?document|upload.?file|file.?storage|document.?storage|attachment|file.?management|document.?management|media.?upload|image.?upload|pdf.?upload|csv.?upload|file.?sharing|s3.?bucket|cloud.?storage|upload.?form)\b/i,
    evidenceLabel: 'document upload / file storage',
  },
  workflow_states: {
    patterns: /\b(workflow.?state|status.?management|status.?tracking|request.?status|order.?status|state.?machine|approval.?flow|approval.?workflow|review.?workflow|submission.?status|pending.?approved|in.?progress|status.?update|pipeline.?stage|kanban|task.?status|job.?status|ticket.?status|case.?status|stage.?transition|lifecycle.?state)\b/i,
    evidenceLabel: 'workflow states / status management',
  },
  multi_step_forms: {
    patterns: /\b(multi.?step.?form|wizard.?form|step.?by.?step|form.?wizard|onboarding.?flow|registration.?flow|intake.?form|application.?form|submission.?form|request.?form|operational.?workflow|process.?form|dynamic.?form|conditional.?form)\b/i,
    evidenceLabel: 'multi-step forms / operational workflows',
  },
};

// ── Research types (for structured consumption) ──────────────────────────────

type ResearchItem = {
  name: string;
  description: string;
  pricing?: string;
  relevance: string;
};

type ResearchCategory = {
  items: ResearchItem[];
  summary: string;
};

type TechnicalResearch = {
  summary: string;
  recommendations: string[];
  assumptions: string[];
  unknowns: string[];
  integrations: ResearchCategory;
  infrastructure: ResearchCategory;
  third_party_services: ResearchCategory;
  compliance: ResearchCategory;
  operating_cost_estimate: ResearchCategory;
};

function isUsableResearch(data: unknown): data is TechnicalResearch {
  if (!data || typeof data !== 'object') return false;
  const r = data as Record<string, unknown>;
  if (typeof r.summary !== 'string') return false;
  if (r.summary.startsWith('Insufficient project scope')) return false;
  return true;
}

// ── Upstream source assembly ─────────────────────────────────────────────────
// Build searchable text from structured upstream outputs in priority order.
// Tracks which sources contributed so the rationale can reference them.

type UpstreamSources = {
  text: string;
  sourcesUsed: string[];
};

function assembleUpstreamText(
  briefRow: Record<string, unknown> | null,
  research: TechnicalResearch | null,
  leadDetails: Record<string, unknown> | null,
  leadScores: Record<string, unknown> | null,
  fallbackContext?: string,
): UpstreamSources {
  const sections: string[] = [];
  const sourcesUsed: string[] = [];

  // ── Priority 1: Structured brief fields (consultant brief output) ──────
  if (briefRow) {
    const briefFields = [
      'project_summary', 'project_type', 'recommended_solution',
      'suggested_pages', 'suggested_features', 'suggested_integrations',
      'timeline_estimate', 'budget_positioning', 'risks_and_unknowns',
      'revision_context',
    ];
    const briefParts: string[] = [];
    for (const f of briefFields) {
      const val = briefRow[f];
      if (typeof val === 'string' && val.trim().length > 10) {
        briefParts.push(val.trim());
      }
    }
    if (briefParts.length > 0) {
      sections.push(briefParts.join(' '));
      sourcesUsed.push('consultant_brief');
    }
    // Revision context is a first-class upstream input
    const revCtx = briefRow['revision_context'];
    if (typeof revCtx === 'string' && revCtx.trim().length > 10) {
      sections.push(revCtx.trim());
      if (!sourcesUsed.includes('revision_context')) sourcesUsed.push('revision_context');
    }
  }

  // ── Priority 2: Technical research (structured categories) ─────────────
  if (research) {
    const researchParts: string[] = [];
    if (research.summary) researchParts.push(research.summary);
    if (research.recommendations?.length > 0) researchParts.push(research.recommendations.join(' '));

    for (const key of ['integrations', 'infrastructure', 'third_party_services', 'compliance', 'operating_cost_estimate'] as const) {
      const cat = research[key] as ResearchCategory | undefined;
      if (!cat) continue;
      if (cat.summary) researchParts.push(cat.summary);
      for (const item of cat.items ?? []) {
        researchParts.push(`${item.name} ${item.description}`);
      }
    }

    if (research.unknowns?.length > 0) researchParts.push(research.unknowns.join(' '));
    if (research.assumptions?.length > 0) researchParts.push(research.assumptions.join(' '));

    if (researchParts.length > 0) {
      sections.push(researchParts.join(' '));
      sourcesUsed.push('technical_research');
    }
  }

  // ── Priority 3: Lead details (clarifiers, success definition) ──────────
  if (leadDetails) {
    const detailParts: string[] = [];
    const clarifiers = leadDetails.clarifier_answers as Record<string, string> | null;
    if (clarifiers && typeof clarifiers === 'object') {
      detailParts.push(Object.values(clarifiers).join(' '));
    }
    if (typeof leadDetails.success_definition === 'string' && leadDetails.success_definition.trim()) {
      detailParts.push(leadDetails.success_definition.trim());
    }
    if (detailParts.length > 0) {
      sections.push(detailParts.join(' '));
      sourcesUsed.push('intake_clarifiers');
    }
  }

  // ── Priority 4: Lead scoring context ───────────────────────────────────
  if (leadScores) {
    const scoreParts: string[] = [];
    if (leadScores.engagement_type) scoreParts.push(String(leadScores.engagement_type));
    if (typeof leadScores.complexity_score === 'number' && leadScores.complexity_score >= 3) {
      scoreParts.push('high_complexity_intake');
    }
    if (scoreParts.length > 0) {
      sections.push(scoreParts.join(' '));
      sourcesUsed.push('lead_scoring');
    }
  }

  // ── Fallback: Raw merged context (only when structured outputs are thin) ─
  if (sections.length === 0 || sections.join(' ').length < 100) {
    if (fallbackContext && fallbackContext.trim().length > 50) {
      sections.push(fallbackContext.trim());
      sourcesUsed.push('raw_context_fallback');
    }
  }

  return {
    text: sections.join(' '),
    sourcesUsed,
  };
}

// ── Signal detection ─────────────────────────────────────────────────────────

function detectSignals(searchText: string): DetectedSignal[] {
  const detected: DetectedSignal[] = [];

  for (const [key, config] of Object.entries(SIGNAL_PATTERNS)) {
    const signalKey = key as SignalKey;
    const match = config.patterns.exec(searchText);
    if (match) {
      detected.push({
        key: signalKey,
        weight: SIGNAL_WEIGHTS[signalKey],
        evidence: `Detected ${config.evidenceLabel} (matched: "${match[0]}")`,
      });
    }
  }

  return detected;
}

// ── Build component derivation ───────────────────────────────────────────────
// Maps detected signals to effort estimates. Always includes discovery + deployment.

function deriveBuildComponents(signals: DetectedSignal[]): BuildComponent[] {
  const components: BuildComponent[] = [];
  const signalKeys = new Set(signals.map((s) => s.key));

  // Always include discovery & deployment
  components.push({ key: 'discovery_architecture', ...BUILD_COMPONENTS.discovery_architecture });
  components.push({ key: 'deployment_launch', ...BUILD_COMPONENTS.deployment_launch });

  // Signal-driven components
  if (signalKeys.has('authentication_roles')) {
    components.push({ key: 'authentication', ...BUILD_COMPONENTS.authentication });
  }
  if (signalKeys.has('booking_system')) {
    components.push({ key: 'booking_system', ...BUILD_COMPONENTS.booking_system });
  }
  if (signalKeys.has('staff_dashboard')) {
    components.push({ key: 'dashboard', ...BUILD_COMPONENTS.dashboard });
  }
  if (signalKeys.has('external_api_integrations') || signalKeys.has('real_time_data')) {
    components.push({ key: 'api_integration', ...BUILD_COMPONENTS.api_integration });
  }
  if (signalKeys.has('custom_business_logic')) {
    components.push({ key: 'custom_logic', ...BUILD_COMPONENTS.custom_logic });
  }
  if (signalKeys.has('payments')) {
    components.push({ key: 'payments', ...BUILD_COMPONENTS.payments });
  }
  if (signalKeys.has('notifications')) {
    components.push({ key: 'notifications', ...BUILD_COMPONENTS.notifications });
  }
  if (signalKeys.has('analytics_reporting')) {
    components.push({ key: 'analytics', ...BUILD_COMPONENTS.analytics });
  }
  if (signalKeys.has('customer_portal')) {
    components.push({ key: 'customer_portal', ...BUILD_COMPONENTS.customer_portal });
  }
  if (signalKeys.has('document_upload')) {
    components.push({ key: 'document_upload', ...BUILD_COMPONENTS.document_upload });
  }
  if (signalKeys.has('workflow_states')) {
    components.push({ key: 'workflow_management', ...BUILD_COMPONENTS.workflow_management });
  }
  if (signalKeys.has('multi_step_forms')) {
    components.push({ key: 'multi_step_forms', ...BUILD_COMPONENTS.multi_step_forms });
  }

  // Testing scales with component count
  if (components.length > 4) {
    components.push({ key: 'testing_qa', ...BUILD_COMPONENTS.testing_qa });
  }

  return components;
}

// ── Rationale builder ────────────────────────────────────────────────────────

function buildRationale(
  score: number,
  cls: ComplexityClass,
  signals: DetectedSignal[],
  sourcesUsed: string[],
): string {
  const parts: string[] = [];

  const sourceLabels: Record<string, string> = {
    consultant_brief: 'reviewed consultant brief',
    technical_research: 'technical research',
    intake_clarifiers: 'intake clarifiers',
    lead_scoring: 'lead scoring',
    revision_context: 'revised information',
    raw_context_fallback: 'raw client context (fallback)',
  };

  const sources = sourcesUsed.map((s) => sourceLabels[s] || s).join(', ');
  parts.push(`Score ${score}/100 (${cls.replace(/_/g, ' ')}) derived from: ${sources}.`);

  if (signals.length > 0) {
    const signalNames = signals.map((s) => `${s.key.replace(/_/g, ' ')} (+${s.weight})`);
    parts.push(`Detected signals: ${signalNames.join(', ')}.`);
  } else {
    parts.push('No high-complexity signals detected in upstream outputs.');
  }

  return parts.join(' ');
}

/**
 * POST /api/hub/leads/[id]/brief/complexity
 *
 * OTwoOne Complexity Engine (v1.77.0).
 * Deterministic 0–100 complexity scoring that consumes structured upstream
 * workflow outputs (brief, research, clarifiers, scoring) in priority order.
 * Falls back to raw context only when structured outputs are insufficient.
 *
 * Body (optional):
 *   merged_context?: string  — raw fallback context from the frontend
 *
 * Returns ComplexityResult
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Parse optional body (merged_context for fallback)
  let fallbackContext: string | undefined;
  try {
    const body = await req.json();
    fallbackContext = body?.merged_context?.trim() || undefined;
  } catch {
    // No body is fine — we'll use DB sources only
  }

  // ── Load structured upstream outputs from DB ───────────────────────────

  // Lead scores + engagement type
  const { data: lead, error: leadErr } = await supabaseServer
    .from('leads')
    .select('engagement_type, complexity_score, total_score, budget, timeline')
    .eq('id', id)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  // Lead details (clarifiers, success definition)
  const { data: details } = await supabaseServer
    .from('lead_details')
    .select('clarifier_answers, success_definition')
    .eq('lead_id', id)
    .maybeSingle();

  // Brief row (consultant brief fields + technical research)
  const { data: briefRow } = await supabaseServer
    .from('lead_briefs')
    .select('project_summary, project_type, recommended_solution, suggested_pages, suggested_features, suggested_integrations, timeline_estimate, budget_positioning, risks_and_unknowns, revision_context, technical_research')
    .eq('lead_id', id)
    .maybeSingle();

  // Extract research if usable
  const research = briefRow?.technical_research && isUsableResearch(briefRow.technical_research)
    ? (briefRow.technical_research as TechnicalResearch)
    : null;

  // ── Assemble searchable text from upstream outputs ─────────────────────
  // Continuity boundary: structured outputs first, raw context as fallback only
  const { text: searchText, sourcesUsed } = assembleUpstreamText(
    briefRow as Record<string, unknown> | null,
    research,
    details as Record<string, unknown> | null,
    lead as Record<string, unknown>,
    fallbackContext,
  );

  if (!searchText || searchText.trim().length < 20) {
    // Insufficient data — return a minimal safe response
    return NextResponse.json({
      complexity_score: 0,
      complexity_class: 'brochure_site' as ComplexityClass,
      detected_signals: [],
      build_components: [
        { key: 'discovery_architecture', ...BUILD_COMPONENTS.discovery_architecture },
        { key: 'deployment_launch', ...BUILD_COMPONENTS.deployment_launch },
      ],
      estimated_days_low: 4,
      estimated_days_high: 6,
      complexity_rationale: 'Insufficient upstream data to assess complexity. Run intake clarifiers, technical research, or consultant brief analysis first.',
      upstream_sources_used: [],
    } satisfies ComplexityResult);
  }

  // ── Detect complexity signals ──────────────────────────────────────────
  const signals = detectSignals(searchText);

  // ── Calculate score ────────────────────────────────────────────────────
  const score = signals.reduce((sum, s) => sum + s.weight, 0);
  const cls = classifyComplexity(score);

  // ── Derive build components and effort ─────────────────────────────────
  const components = deriveBuildComponents(signals);
  const daysLow = components.reduce((sum, c) => sum + c.days_low, 0);
  const daysHigh = components.reduce((sum, c) => sum + c.days_high, 0);

  // ── Build rationale from evidence ──────────────────────────────────────
  const rationale = buildRationale(score, cls, signals, sourcesUsed);

  const result: ComplexityResult = {
    complexity_score: score,
    complexity_class: cls,
    detected_signals: signals,
    build_components: components,
    estimated_days_low: daysLow,
    estimated_days_high: daysHigh,
    complexity_rationale: rationale,
    upstream_sources_used: sourcesUsed,
  };

  return NextResponse.json(result);
}
