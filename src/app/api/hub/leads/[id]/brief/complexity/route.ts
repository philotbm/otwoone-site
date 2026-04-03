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

// v1.95.0: Architecture-level signals (system complexity, not feature presence)
type ArchitectureSignalKey =
  | 'multi_system_integration'
  | 'external_dependency_critical'
  | 'financial_transaction_logic'
  | 'data_migration'
  | 'real_time_multi_source_sync'
  | 'operational_core_system';

type ArchitectureSignal = {
  key: ArchitectureSignalKey;
  score: number;
  evidence: string;
};

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

// ── v1.95.0: Architecture signal definitions ────────────────────────────────
// These detect system-level architectural complexity: multi-system integration,
// financial logic, data migration, real-time sync, operational criticality.
// They are scored separately and applied as a multiplier on top of feature signals.

const ARCHITECTURE_SIGNALS: Record<ArchitectureSignalKey, { patterns: RegExp; score: number; evidenceLabel: string }> = {
  multi_system_integration: {
    patterns: /\b(multiple\s+systems|centrali[sz]ed\s+system|replace\s+existing\s+systems?|unify\s+systems?|single\s+platform|one\s+system\s+for|currently\s+using\s+\d+|bring\s+(?:everything|all)\s+(?:into|together)|consolidat)/i,
    score: 20,
    evidenceLabel: 'multi-system integration',
  },
  external_dependency_critical: {
    patterns: /\b(brs|golf\s+ireland|third[- ]party\s+api|external\s+system|pos\s+system|point[- ]of[- ]sale|integration\s+required|must\s+integrate\s+with|tee\s*sheet|handicap\s+system|epos|till\s+system)\b/i,
    score: 15,
    evidenceLabel: 'critical external dependency',
  },
  financial_transaction_logic: {
    patterns: /\b(balance|wallet|top[- ]?up|ledger|credit\s+(?:system|account|balance)|debit|financial\s+transaction|account\s+balance|prepaid|stored\s+value|member\s+(?:account|credit|balance)|bar\s+tab|spending\s+limit)\b/i,
    score: 20,
    evidenceLabel: 'financial/transactional logic',
  },
  data_migration: {
    patterns: /\b(move\s+from|migrat(?:ion|e|ing)|existing\s+system|legacy\s+system|transfer\s+(?:data|records|members?)|import\s+(?:existing|current|historical)|replace\s+(?:current|existing)|switch\s+from)\b/i,
    score: 15,
    evidenceLabel: 'data migration / legacy replacement',
  },
  real_time_multi_source_sync: {
    patterns: /\b(real[- ]?time\s+sync|synchroni[sz](?:ation|e|ing)|sync\s+across|live\s+(?:data|feed|update|availability|status)|real[- ]?time\s+(?:update|availab|inventory|stock))\b/i,
    score: 15,
    evidenceLabel: 'real-time multi-source sync',
  },
  operational_core_system: {
    patterns: /\b(run\s+the\s+(?:business|club|operation)|daily\s+operations?|staff\s+(?:use|rely|depend)|manage\s+(?:all\s+)?operations?|core\s+(?:system|platform)|business[- ]critical|operationally\s+critical|entire\s+(?:business|operation))\b/i,
    score: 15,
    evidenceLabel: 'operational core system',
  },
};

// Architecture-driven build effort additions
const ARCHITECTURE_BUILD_COMPONENTS: Record<string, { label: string; days_low: number; days_high: number }> = {
  system_integration: { label: 'System integration layer', days_low: 5, days_high: 8 },
  external_api_bridge: { label: 'External API bridge', days_low: 4, days_high: 7 },
  financial_engine: { label: 'Financial transaction engine', days_low: 5, days_high: 8 },
  data_migration_work: { label: 'Data migration & import', days_low: 4, days_high: 7 },
  sync_layer: { label: 'Real-time sync layer', days_low: 3, days_high: 5 },
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
    patterns: /\b(book(?:ing|ed|s)\s+(?:a\s+)?(?:appointment|session|class|slot|time|room|table|court|bay)|online\s+booking|booking\s+system|booking\s+flow|booking\s+platform|appointment\s*booking|reservation\s*system|time.?slot|calendar.?booking|session.?booking|class.?booking|slot.?allocat|capacity.?manag|availability.?(?:check|calendar)|select\s+(?:a\s+)?time|choose\s+(?:a\s+)?date|schedule\s+(?:a\s+)?(?:session|appointment|class|call|meeting|consultation))\b/i,
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
    patterns: /\b(staff.?dashboard|admin.?dashboard|admin.?panel|back.?office\s+(?:system|dashboard|panel)|internal.?(?:system|dashboard)|ops.?dashboard|management.?dashboard)\b/i,
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
    patterns: /\b(reporting.?dashboard|admin.?reporting|metrics.?dashboard|revenue.?report|occupancy.?report|usage.?report|business.?intelligence|data.?visualis(?:ation|ization)\s+dashboard|kpi.?dashboard)\b/i,
    evidenceLabel: 'analytics/reporting',
  },
  authentication_roles: {
    patterns: /\b(authentication|auth|login|user.?role|role.?based|rbac|permission|access.?control|staff.?access|admin.?access|oauth|sso|multi.?tenant|user.?account)\b/i,
    evidenceLabel: 'authentication & roles',
  },
  infrastructure_deployment_complexity: {
    patterns: /\b(custom.?hosting|scaling.?system|multi.?region|high.?traffic.?system|kubernetes|docker.?orchestrat|microservice.?architect|load.?balanc(?:er|ing)\s+(?:system|cluster)|database.?cluster|self.?hosted.?infra)\b/i,
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
  iterations: Array<{ notes: string; source_type?: string }> | null,
  fallbackContext?: string,
): UpstreamSources {
  const sections: string[] = [];
  const sourcesUsed: string[] = [];

  // ── v1.94.0: Signal Integrity Layer ────────────────────────────────────
  // ONLY include confirmed-requirement sources in signal detection text.
  // Technical research / suggested integrations / infrastructure suggestions
  // are EXCLUDED — they describe tooling options, not confirmed requirements.

  // ── Priority 1: Confirmed brief fields (summary, type, solution, features) ───
  if (briefRow) {
    const confirmedFields = ['project_summary', 'project_type', 'recommended_solution', 'suggested_features'];
    const briefParts: string[] = [];
    for (const f of confirmedFields) {
      const val = briefRow[f];
      if (typeof val === 'string' && val.trim().length > 10) {
        briefParts.push(val.trim());
      }
    }
    if (briefParts.length > 0) {
      sections.push(briefParts.join(' '));
      sourcesUsed.push('consultant_brief');
    }
    const revCtx = briefRow['revision_context'];
    if (typeof revCtx === 'string' && revCtx.trim().length > 10) {
      sections.push(revCtx.trim());
      if (!sourcesUsed.includes('revision_context')) sourcesUsed.push('revision_context');
    }
  }

  // ── v1.99.4: Priority 2: Raw iteration evidence (operator-confirmed inputs) ─
  // Iterations are raw evidence: call notes, meeting notes, email replies.
  // They contain confirmed requirements that MUST influence complexity scoring.
  // This prevents scope collapse when autofill produces a thin derived summary.
  if (iterations && iterations.length > 0) {
    const iterText = iterations.map(it => it.notes).join(' ');
    if (iterText.trim().length > 10) {
      sections.push(iterText.trim());
      sourcesUsed.push('iteration_evidence');
    }
  }

  // ── Priority 3: Technical research — EXCLUDED from signal detection ────
  // (v1.94.0: research describes tooling options, not confirmed requirements.)
  if (research) {
    sourcesUsed.push('technical_research_excluded');
  }

  // ── Priority 4: Lead details (client request = primary source of truth) ─
  if (leadDetails) {
    const detailParts: string[] = [];
    if (typeof leadDetails.success_definition === 'string' && leadDetails.success_definition.trim()) {
      detailParts.push(leadDetails.success_definition.trim());
    }
    if (detailParts.length > 0) {
      sections.push(detailParts.join(' '));
      sourcesUsed.push('client_request');
    }
  }

  // ── Priority 5: Lead scoring context ───────────────────────────────────
  if (leadScores) {
    const scoreParts: string[] = [];
    if (leadScores.engagement_type) scoreParts.push(String(leadScores.engagement_type));
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

// Contact-only negative filter for booking system false positives
const CONTACT_ONLY_TERMS = /\b(contact\s+form|get\s+a\s+quote|enquiry\s+form|submit\s+request|email\s+us|lead\s+form|quote\s+request|request\s+a\s+(?:quote|callback)|send\s+(?:us\s+)?(?:a\s+)?message)\b/i;
const STRONG_BOOKING_TERMS = /\b(book(?:ing|ed|s)\s+(?:a\s+)?(?:appointment|session|class|slot|time|room|table|court|bay)|online\s+booking|booking\s+system|booking\s+flow|booking\s+platform|appointment\s*booking|reservation\s*system|time.?slot|calendar.?booking|session.?booking|class.?booking|slot.?allocat|capacity.?manag|availability.?(?:check|calendar)|select\s+(?:a\s+)?time|choose\s+(?:a\s+)?date|schedule\s+(?:a\s+)?(?:session|appointment|class|call|meeting|consultation))\b/i;

// v1.94.0: Optional / phased feature filter
const OPTIONAL_CONTEXT_RE = /\b(optional|post[- ]launch|phase\s*2|phase\s*two|if\s+desired|could\s+be\s+added|nice\s+to\s+have|future\s+enhancement|later\s+phase|stretch\s+goal|not\s+essential)\b/i;

function detectSignals(searchText: string): DetectedSignal[] {
  const detected: DetectedSignal[] = [];
  const filtered: Array<{ key: string; reason: string }> = [];

  for (const [key, config] of Object.entries(SIGNAL_PATTERNS)) {
    const signalKey = key as SignalKey;
    config.patterns.lastIndex = 0; // reset regex
    const match = config.patterns.exec(searchText);
    if (match) {
      // Booking system: require strong scheduling terms AND not contact-only context
      if (signalKey === "booking_system") {
        const hasStrongBooking = STRONG_BOOKING_TERMS.test(searchText);
        const hasContactOnly = CONTACT_ONLY_TERMS.test(searchText) && !hasStrongBooking;
        if (!hasStrongBooking || hasContactOnly) {
          filtered.push({ key: signalKey, reason: "booking false-positive: contact-only context" });
          continue;
        }
      }

      // v1.94.0: Optional/phased feature filter
      // Check if the matched term appears only in optional/phased context
      const matchIdx = match.index;
      const surroundStart = Math.max(0, matchIdx - 80);
      const surroundEnd = Math.min(searchText.length, matchIdx + match[0].length + 80);
      const surrounding = searchText.slice(surroundStart, surroundEnd);
      if (OPTIONAL_CONTEXT_RE.test(surrounding)) {
        filtered.push({ key: signalKey, reason: `optional/phased context: "${surrounding.trim().slice(0, 60)}…"` });
        continue;
      }

      detected.push({
        key: signalKey,
        weight: SIGNAL_WEIGHTS[signalKey],
        evidence: `Detected ${config.evidenceLabel} (matched: "${match[0]}")`,
      });
    }
  }

  // v1.94.0 + v1.94.2: Website guardrails (hardened)
  const detectedKeys = new Set(detected.map(d => d.key));
  const removeSet = new Set<string>();

  // Guardrail 1: No complex systems → remove platform-implied signals
  const hasNoComplexSystems =
    !detectedKeys.has("booking_system") &&
    !detectedKeys.has("staff_dashboard") &&
    !detectedKeys.has("customer_portal") &&
    !detectedKeys.has("workflow_states");

  if (hasNoComplexSystems) {
    for (const k of ["custom_business_logic", "authentication_roles", "payments"] as const) {
      if (detectedKeys.has(k)) {
        filtered.push({ key: k, reason: "website guardrail: no booking/dashboard/portal/workflow detected" });
        removeSet.add(k);
      }
    }
  }

  // Guardrail 2 (v1.94.2): Website project types → auto-remove system-level signals
  // unless they survived as explicitly required (booking/customer_portal present)
  const isWebsiteType = searchText.toLowerCase().match(/\b(growth.?website|business.?website|brochure|lead.?gen|marketing.?site|corporate.?site|landing.?page)\b/i);
  if (isWebsiteType && hasNoComplexSystems) {
    for (const k of ["staff_dashboard", "analytics_reporting", "infrastructure_deployment_complexity"] as const) {
      if (detectedKeys.has(k) && !removeSet.has(k)) {
        filtered.push({ key: k, reason: "website type guardrail: system-level signal not required for website" });
        removeSet.add(k);
      }
    }
  }

  const finalDetected = removeSet.size > 0 ? detected.filter(d => !removeSet.has(d.key)) : detected;
  (finalDetected as unknown as { _filtered?: typeof filtered })._filtered = filtered;
  return finalDetected;
}

// ── v1.95.0: Architecture signal detection ──────────────────────────────────
// Uses same rules: allowed sources only, optional/phased filter applied.

function detectArchitectureSignals(searchText: string): ArchitectureSignal[] {
  const detected: ArchitectureSignal[] = [];

  for (const [key, config] of Object.entries(ARCHITECTURE_SIGNALS)) {
    const archKey = key as ArchitectureSignalKey;
    config.patterns.lastIndex = 0;
    const match = config.patterns.exec(searchText);
    if (match) {
      // Apply same optional/phased filter
      const surroundStart = Math.max(0, match.index - 80);
      const surroundEnd = Math.min(searchText.length, match.index + match[0].length + 80);
      const surrounding = searchText.slice(surroundStart, surroundEnd);
      if (OPTIONAL_CONTEXT_RE.test(surrounding)) continue;

      detected.push({
        key: archKey,
        score: config.score,
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
  archSignals?: ArchitectureSignal[],
  archMultiplier?: string,
): string {
  const parts: string[] = [];

  const sourceLabelsMap: Record<string, string> = {
    consultant_brief: 'reviewed consultant brief',
    technical_research: 'technical research',
    intake_clarifiers: 'intake clarifiers',
    lead_scoring: 'lead scoring',
    revision_context: 'revised information',
    raw_context_fallback: 'raw client context (fallback)',
    technical_research_excluded: 'technical research (excluded from signal detection)',
    client_request: 'client request',
  };

  const sources = sourcesUsed.map((s) => sourceLabelsMap[s] || s).join(', ');
  parts.push(`Score ${score}/100 (${cls.replace(/_/g, ' ')}) derived from: ${sources}.`);

  if (signals.length > 0) {
    const signalNames = signals.map((s) => `${s.key.replace(/_/g, ' ')} (+${s.weight})`);
    parts.push(`Detected signals: ${signalNames.join(', ')}.`);
  } else {
    parts.push('No high-complexity signals detected in upstream outputs.');
  }

  // v1.94.0: Include filtered signals in rationale for operator transparency
  const filteredList = (signals as unknown as { _filtered?: Array<{ key: string; reason: string }> })._filtered;
  if (filteredList && filteredList.length > 0) {
    parts.push(`Filtered signals: ${filteredList.map(f => `${f.key.replace(/_/g, ' ')} (${f.reason})`).join('; ')}.`);
  }

  // v1.95.0: Architecture signals
  if (archSignals && archSignals.length > 0) {
    parts.push(`Architecture signals detected: ${archSignals.map(a => a.key.replace(/_/g, ' ')).join(', ')}.`);
    parts.push(`Architecture multiplier applied: ${archMultiplier || 'none'}.`);
  }

  return parts.join(' ');
}

/**
 * POST /api/hub/leads/[id]/brief/complexity
 *
 * StudioFlow Complexity Engine (v1.77.0).
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

  // v1.99.4: Load iteration evidence — raw operator-confirmed inputs
  const { data: iterationRows } = await supabaseServer
    .from('lead_iterations')
    .select('notes, source_type')
    .eq('lead_id', id)
    .order('created_at', { ascending: true });

  // Extract research if usable
  const research = briefRow?.technical_research && isUsableResearch(briefRow.technical_research)
    ? (briefRow.technical_research as TechnicalResearch)
    : null;

  // ── Assemble searchable text from upstream outputs + raw evidence ──────
  const { text: searchText, sourcesUsed } = assembleUpstreamText(
    briefRow as Record<string, unknown> | null,
    research,
    details as Record<string, unknown> | null,
    lead as Record<string, unknown>,
    iterationRows as Array<{ notes: string; source_type?: string }> | null,
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

  // ── v1.95.0: Detect architecture signals ───────────────────────────────
  const archSignals = detectArchitectureSignals(searchText);
  const archCount = archSignals.length;

  // ── Calculate raw score ────────────────────────────────────────────────
  let rawScore = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));

  // ── v1.95.0: Architecture multiplier ───────────────────────────────────
  // Architecture signals amplify score to reflect system-level complexity
  // that feature detection alone underestimates.
  let archMultiplierLabel = "none";
  if (archCount >= 5) {
    rawScore = Math.round(rawScore * 1.6);
    archMultiplierLabel = "1.6x";
  } else if (archCount >= 3) {
    rawScore = Math.round(rawScore * 1.35);
    archMultiplierLabel = "1.35x";
  } else if (archCount >= 1) {
    rawScore = Math.round(rawScore * 1.15);
    archMultiplierLabel = "1.15x";
  }

  // ── v1.95.0: Platform floor rule ───────────────────────────────────────
  // Multi-system + financial logic = minimum 75 complexity
  const hasMultiSystem = archSignals.some(a => a.key === "multi_system_integration");
  const hasFinancial = archSignals.some(a => a.key === "financial_transaction_logic");
  if (hasMultiSystem && hasFinancial && rawScore < 75) {
    rawScore = 75;
  }

  // Cap at 100
  rawScore = Math.min(100, rawScore);

  // ── v1.95.1: Operational Depth Gate ────────────────────────────────────
  // A project may only classify as top-tier (operational_platform, score >65)
  // if it demonstrates genuine operational depth, not just bundled features.
  //
  // Condition A (at least one): operational_core_system, data_migration, multi_system_integration
  // Condition B (at least one): financial_transaction_logic, real_time_multi_source_sync
  // Both conditions must be met. If not → cap score at 65.
  const archKeySet = new Set(archSignals.map(a => a.key));
  const depthConditionA =
    archKeySet.has("operational_core_system") ||
    archKeySet.has("data_migration") ||
    archKeySet.has("multi_system_integration");
  const depthConditionB =
    archKeySet.has("financial_transaction_logic") ||
    archKeySet.has("real_time_multi_source_sync");
  const hasOperationalDepth = depthConditionA && depthConditionB;

  if (!hasOperationalDepth && rawScore > 65) {
    rawScore = 65;
  }

  // ── v1.93.5: SMB system calibration ────────────────────────────────────
  // SMB: single-business, booking+payments+accounts, no multi-tenant/marketplace.
  // v1.95.0: Skip SMB cap when architecture signals show real platform work.
  // v1.95.1: Depth gate already constrains non-platform projects, so SMB cap
  //          only applies to the narrow band between 65-70 for non-enterprise.
  const lc = searchText.toLowerCase();
  const enterpriseIndicators = ["multi-tenant", "multi_tenant", "marketplace", "saas platform", "enterprise integration", "erp"].filter(t => lc.includes(t)).length;
  const isSmbOperational = rawScore >= 70 && enterpriseIndicators === 0 && !hasOperationalDepth;

  // Cap SMB systems at 70 — but NOT if operational depth gate passed
  const score = isSmbOperational ? Math.min(rawScore, 70) : rawScore;
  const cls = classifyComplexity(score);

  // ── Derive build components and effort ─────────────────────────────────
  const components = deriveBuildComponents(signals);

  // v1.95.0: Add architecture-driven build components
  const archKeys = new Set(archSignals.map(a => a.key));
  if (archKeys.has('multi_system_integration')) {
    components.push({ key: 'system_integration', ...ARCHITECTURE_BUILD_COMPONENTS.system_integration });
  }
  if (archKeys.has('external_dependency_critical')) {
    components.push({ key: 'external_api_bridge', ...ARCHITECTURE_BUILD_COMPONENTS.external_api_bridge });
  }
  if (archKeys.has('financial_transaction_logic')) {
    components.push({ key: 'financial_engine', ...ARCHITECTURE_BUILD_COMPONENTS.financial_engine });
  }
  if (archKeys.has('data_migration')) {
    components.push({ key: 'data_migration_work', ...ARCHITECTURE_BUILD_COMPONENTS.data_migration_work });
  }
  if (archKeys.has('real_time_multi_source_sync')) {
    components.push({ key: 'sync_layer', ...ARCHITECTURE_BUILD_COMPONENTS.sync_layer });
  }

  let daysLow = components.reduce((sum, c) => sum + c.days_low, 0);
  let daysHigh = components.reduce((sum, c) => sum + c.days_high, 0);

  // ── v1.93.5: Modern managed-stack MVP dampener ─────────────────────────
  const managedStackTerms = ["next.js", "nextjs", "vercel", "supabase", "stripe", "clerk", "resend", "firebase", "netlify", "railway", "planetscale", "neon"];
  const managedStackHits = managedStackTerms.filter(t => lc.includes(t)).length;
  const isManagedStack = managedStackHits >= 2;

  const mvpTerms = ["mvp", "phase 1", "phase one", "phased delivery", "phased approach", "core features first", "initial release", "accelerator scope", "optional phase 2", "optional enhancements", "launch first"];
  const isMvpPhased = mvpTerms.some(t => lc.includes(t));

  let effortFactor = 1.0;
  if (isManagedStack) effortFactor *= 0.85;
  if (isMvpPhased) effortFactor *= 0.80;

  if (effortFactor < 1.0) {
    daysLow = Math.max(4, Math.round(daysLow * effortFactor));
    daysHigh = Math.max(6, Math.round(daysHigh * effortFactor));
  }

  // ── v1.94.1: Content-driven complexity boost ───────────────────────────
  let contentBoost = 0;
  const contentTerms = ["projects", "portfolio", "case stud", "gallery", "showcase"];
  if (contentTerms.some(t => lc.includes(t))) contentBoost += 5;
  const seoTerms = ["seo", "blog", "content marketing", "content strategy", "articles"];
  if (seoTerms.some(t => lc.includes(t))) contentBoost += 5;

  // ── v1.94.1: Baseline complexity floors ────────────────────────────────
  const projectType = (typeof briefRow?.['project_type'] === 'string' ? briefRow['project_type'] : '').toLowerCase();
  const isGrowthWebsite = ["growth website", "business website", "lead generation"].some(t => projectType.includes(t) || lc.includes(t));
  const isBrochureSite = projectType.includes("brochure") || cls === "brochure_site";

  let scoreFloor = 0;
  let daysFloor = 4;
  if (isGrowthWebsite && !isBrochureSite) {
    scoreFloor = 20;
    daysFloor = 10;
  } else if (isBrochureSite) {
    scoreFloor = 10;
    daysFloor = 5;
  }

  // Apply floors and content boost to final score
  const finalScore = Math.min(100, Math.max(score + contentBoost, scoreFloor));
  const finalCls = classifyComplexity(finalScore);
  daysLow = Math.max(daysFloor, daysLow);
  daysHigh = Math.max(daysFloor + 2, daysHigh);

  // ── Build rationale from evidence ──────────────────────────────────────
  const rationale = buildRationale(finalScore, finalCls, signals, sourcesUsed, archSignals, archMultiplierLabel);

  const result: ComplexityResult = {
    complexity_score: finalScore,
    complexity_class: finalCls,
    detected_signals: signals,
    build_components: components,
    estimated_days_low: daysLow,
    estimated_days_high: daysHigh,
    complexity_rationale: rationale,
    upstream_sources_used: sourcesUsed,
  };

  return NextResponse.json(result);
}
