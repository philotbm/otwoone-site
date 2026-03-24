/**
 * OTwoOne OS — Context Quality Engine (v1.100.0)
 *
 * Deterministic evaluation of whether a lead has enough confirmed
 * information for reliable analysis. Returns a structured result
 * with band, missing signals, and explicit assumptions.
 *
 * No AI calls. Pure keyword/signal logic.
 */

// ── Signal areas we look for in merged context ──────────────────────────────

type SignalArea = {
  key: string;
  label: string;
  /** Regex patterns that indicate this area is addressed in the context */
  patterns: RegExp;
  /** Weight for scoring (higher = more important for analysis reliability) */
  weight: number;
  /** Plain-English prompt shown when this signal is missing */
  missingPrompt: string;
  /** Assumption text injected into analysis when this signal is absent */
  assumption: string;
};

const SIGNAL_AREAS: SignalArea[] = [
  {
    key: "user_accounts",
    label: "User accounts & authentication",
    patterns: /\b(user.?account|login|auth|sign.?in|member.?portal|customer.?portal|staff.?dashboard|role.?based|rbac|permission|access.?control|self.?registration|onboarding)\b/i,
    weight: 8,
    missingPrompt: "Will users need accounts and logins?",
    assumption: "Assume authentication is required if multiple user roles or member/staff access is implied.",
  },
  {
    key: "data_storage",
    label: "Data storage & records",
    patterns: /\b(database|store|record|member.?data|customer.?data|persist|storage|migration|import|export|csv|data.?model|schema|table|collection)\b/i,
    weight: 7,
    missingPrompt: "Will this need a database to store operational data?",
    assumption: "Assume a managed database is required when operational records, members, or transactions are implied.",
  },
  {
    key: "integrations",
    label: "Integrations & external systems",
    patterns: /\b(api|integrat|third.?party|external.?system|webhook|sync|connect.?to|pos|brs|square|stripe|xero|quickbooks|zapier|hubspot|salesforce)\b/i,
    weight: 8,
    missingPrompt: "Are there third-party systems or APIs involved?",
    assumption: "No external integrations assumed unless explicitly mentioned.",
  },
  {
    key: "workflows",
    label: "Operational workflows",
    patterns: /\b(workflow|approval|review|status.?track|booking|scheduling|reservation|order|queue|pipeline|process|staff.?manage|admin.?tool|back.?office|reconcil|audit)\b/i,
    weight: 7,
    missingPrompt: "Are there internal operational workflows (approvals, scheduling, etc.)?",
    assumption: "No complex operational workflows assumed unless described.",
  },
  {
    key: "notifications",
    label: "Email & notifications",
    patterns: /\b(email|notification|alert|reminder|sms|push.?notif|confirmation|invite|transactional.?email|automated.?email)\b/i,
    weight: 4,
    missingPrompt: "Will the system send emails, reminders, or notifications?",
    assumption: "Assume transactional email/notifications are required when onboarding or alerts are implied.",
  },
  {
    key: "hosting",
    label: "Hosting & production environment",
    patterns: /\b(hosting|vercel|netlify|aws|azure|cloud|server|deploy|production|domain|ssl|cdn|docker|infrastructure)\b/i,
    weight: 3,
    missingPrompt: "Should we assume a hosted production system?",
    assumption: "Assume a production-ready hosted web application on managed infrastructure.",
  },
  {
    key: "reporting",
    label: "Reporting & analytics",
    patterns: /\b(report|analytics|dashboard.?report|export|csv.?export|metric|kpi|revenue.?report|activity.?report|insight|data.?visualis)\b/i,
    weight: 5,
    missingPrompt: "Will reporting, exports, or analytics be required?",
    assumption: "No reporting or analytics assumed unless specified.",
  },
  {
    key: "payments",
    label: "Payments & transactions",
    patterns: /\b(payment|transaction|billing|invoice|checkout|subscription|deposit|refund|top.?up|balance|wallet|ledger|stripe|square.?pay|credit|debit)\b/i,
    weight: 8,
    missingPrompt: "Will the system handle payments or financial transactions?",
    assumption: "No payment processing assumed unless described.",
  },
  {
    key: "timeline",
    label: "Timeline & delivery expectations",
    patterns: /\b(\d+\s*week|\d+\s*month|deadline|launch.?date|go.?live|timeline|delivery|phase\s*\d|mvp|sprint|milestone|urgent|asap)\b/i,
    weight: 3,
    missingPrompt: "Is there a target timeline or delivery expectation?",
    assumption: "No specific timeline constraint assumed.",
  },
  {
    key: "scope_definition",
    label: "Core scope definition",
    patterns: /\b(website|web.?app|platform|system|portal|mobile.?app|ios|android|native|pwa|booking.?system|crm|erp|saas|marketplace|e.?commerce|shop|store)\b/i,
    weight: 10,
    missingPrompt: "What type of product is needed (website, web app, platform, mobile app)?",
    assumption: "Assume a production-ready web application unless scope is otherwise specified.",
  },
];

// ── Scoring thresholds ──────────────────────────────────────────────────────

const WEAK_THRESHOLD = 25;    // below this = weak
const STRONG_THRESHOLD = 55;  // at or above this = strong
// between = workable

// ── Public types ────────────────────────────────────────────────────────────

export type ContextQualityBand = "weak" | "workable" | "strong";

export type ContextQualityResult = {
  score: number;
  maxScore: number;
  band: ContextQualityBand;
  confirmedSignals: string[];
  missingSignals: Array<{ key: string; label: string; prompt: string }>;
  assumptions: string[];
  rationale: string;
};

// ── Main evaluation function ────────────────────────────────────────────────

export function evaluateContextQuality(mergedContext: string): ContextQualityResult {
  const maxScore = SIGNAL_AREAS.reduce((sum, a) => sum + a.weight, 0);
  let score = 0;
  const confirmedSignals: string[] = [];
  const missingSignals: Array<{ key: string; label: string; prompt: string }> = [];
  const assumptions: string[] = [];

  for (const area of SIGNAL_AREAS) {
    if (area.patterns.test(mergedContext)) {
      score += area.weight;
      confirmedSignals.push(area.label);
    } else {
      missingSignals.push({
        key: area.key,
        label: area.label,
        prompt: area.missingPrompt,
      });
      if (area.assumption) {
        assumptions.push(area.assumption);
      }
    }
  }

  const band: ContextQualityBand =
    score < WEAK_THRESHOLD ? "weak" :
    score >= STRONG_THRESHOLD ? "strong" :
    "workable";

  const pct = Math.round((score / maxScore) * 100);
  const rationale =
    band === "strong"
      ? `${confirmedSignals.length} of ${SIGNAL_AREAS.length} signal areas confirmed (${pct}%). Enough context for reliable analysis.`
      : band === "workable"
      ? `${confirmedSignals.length} of ${SIGNAL_AREAS.length} signal areas confirmed (${pct}%). Analysis can proceed with ${assumptions.length} assumption${assumptions.length !== 1 ? "s" : ""}.`
      : `Only ${confirmedSignals.length} of ${SIGNAL_AREAS.length} signal areas confirmed (${pct}%). Add more detail before relying on analysis outputs.`;

  return {
    score,
    maxScore,
    band,
    confirmedSignals,
    missingSignals,
    assumptions,
    rationale,
  };
}

/**
 * Build an assumptions block for injection into analysis prompts.
 * Only includes assumptions for missing signals.
 */
export function buildAssumptionsBlock(result: ContextQualityResult): string {
  if (result.assumptions.length === 0) return "";
  return (
    "## System assumptions (context incomplete)\n" +
    "The following assumptions are being used because explicit information was not provided. " +
    "These may change as more context is gathered.\n\n" +
    result.assumptions.map((a, i) => `${i + 1}. ${a}`).join("\n")
  );
}
