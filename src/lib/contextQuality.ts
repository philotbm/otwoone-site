/**
 * StudioFlow — Context Quality Engine (v1.100.2)
 *
 * Decision-readiness evaluation: does this lead have enough confirmed
 * evidence to confidently scope, price, and propose?
 *
 * Model: signal coverage + evidence depth + decision-readiness boosters.
 * Strong ≠ every field filled. Strong = enough to propose confidently.
 *
 * No AI calls. Pure deterministic logic.
 */

// ── Signal areas (coverage layer) ───────────────────────────────────────────

type SignalArea = {
  key: string;
  label: string;
  patterns: RegExp;
  weight: number;
  /** True = absence blocks proposal (core blocker). False = refinement only. */
  blocker: boolean;
  missingPrompt: string;
  assumption: string;
};

const SIGNAL_AREAS: SignalArea[] = [
  {
    key: "scope_definition",
    label: "Core scope definition",
    patterns: /\b(website|web.?app|platform|system|portal|mobile.?app|ios|android|native|pwa|booking.?system|crm|erp|saas|marketplace|e.?commerce|shop|store)\b/i,
    weight: 10, blocker: true,
    missingPrompt: "What type of product is needed (website, web app, platform, mobile app)?",
    assumption: "Assume a production-ready web application unless scope is otherwise specified.",
  },
  {
    key: "user_accounts",
    label: "User accounts & authentication",
    patterns: /\b(user.?account|login|auth|sign.?in|member.?portal|customer.?portal|staff.?dashboard|role.?based|rbac|permission|access.?control|self.?registration|onboarding)\b/i,
    weight: 8, blocker: true,
    missingPrompt: "Will users need accounts and logins?",
    assumption: "Assume authentication is required if multiple user roles or member/staff access is implied.",
  },
  {
    key: "data_storage",
    label: "Data storage & records",
    patterns: /\b(database|store|record|member.?data|customer.?data|persist|storage|migration|import|export|csv|data.?model|schema|table|collection)\b/i,
    weight: 7, blocker: true,
    missingPrompt: "Will this need a database to store operational data?",
    assumption: "Assume a managed database is required when operational records, members, or transactions are implied.",
  },
  {
    key: "integrations",
    label: "Integrations & external systems",
    patterns: /\b(api|integrat|third.?party|external.?system|webhook|sync|connect.?to|pos|brs|square|stripe|xero|quickbooks|zapier|hubspot|salesforce)\b/i,
    weight: 8, blocker: false,
    missingPrompt: "Are there third-party systems or APIs involved?",
    assumption: "No external integrations assumed unless explicitly mentioned.",
  },
  {
    key: "workflows",
    label: "Operational workflows",
    patterns: /\b(workflow|approval|review|status.?track|booking|scheduling|reservation|order|queue|pipeline|process|staff.?manage|admin.?tool|back.?office|reconcil|audit)\b/i,
    weight: 7, blocker: false,
    missingPrompt: "Are there internal operational workflows (approvals, scheduling, etc.)?",
    assumption: "No complex operational workflows assumed unless described.",
  },
  {
    key: "notifications",
    label: "Email & notifications",
    patterns: /\b(email|notification|alert|reminder|sms|push.?notif|confirmation|invite|transactional.?email|automated.?email)\b/i,
    weight: 4, blocker: false,
    missingPrompt: "Will the system send emails, reminders, or notifications?",
    assumption: "Assume transactional email/notifications are required when onboarding or alerts are implied.",
  },
  {
    key: "hosting",
    label: "Hosting & production environment",
    patterns: /\b(hosting|vercel|netlify|aws|azure|cloud|server|deploy|production|domain|ssl|cdn|docker|infrastructure)\b/i,
    weight: 3, blocker: false,
    missingPrompt: "Should we assume a hosted production system?",
    assumption: "Assume a production-ready hosted web application on managed infrastructure.",
  },
  {
    key: "reporting",
    label: "Reporting & analytics",
    patterns: /\b(report|analytics|dashboard.?report|export|csv.?export|metric|kpi|revenue.?report|activity.?report|insight|data.?visualis)\b/i,
    weight: 5, blocker: false,
    missingPrompt: "Will reporting, exports, or analytics be required?",
    assumption: "No reporting or analytics assumed unless specified.",
  },
  {
    key: "payments",
    label: "Payments & transactions",
    patterns: /\b(payment|transaction|billing|invoice|checkout|subscription|deposit|refund|top.?up|balance|wallet|ledger|stripe|square.?pay|credit|debit)\b/i,
    weight: 8, blocker: false,
    missingPrompt: "Will the system handle payments or financial transactions?",
    assumption: "No payment processing assumed unless described.",
  },
  {
    key: "timeline",
    label: "Timeline & delivery expectations",
    patterns: /\b(\d+\s*week|\d+\s*month|deadline|launch.?date|go.?live|timeline|delivery|phase\s*\d|mvp|sprint|milestone|urgent|asap)\b/i,
    weight: 3, blocker: false,
    missingPrompt: "Is there a target timeline or delivery expectation?",
    assumption: "No specific timeline constraint assumed.",
  },
];

// ── Evidence depth signals (decision-readiness boosters) ────────────────────

/**
 * v1.100.6: Explicit resolved signals from structured analysis outputs.
 * Each maps to a blocker signal key. When true, that blocker is considered
 * resolved regardless of whether the pattern matches in raw intake text.
 */
export type ResolvedSignals = {
  /** Auth resolved: research mentions auth provider, complexity has authentication_roles, or assumptions include auth */
  user_accounts: boolean;
  /** Data resolved: research mentions database/storage, complexity has data signals, or assumptions include database */
  data_storage: boolean;
  /** Scope resolved: brief summary is substantial, or sufficient complexity signals exist */
  scope_definition: boolean;
};

type EvidenceDepthInput = {
  /** Number of iteration entries (calls, meetings, emails) */
  iterationCount: number;
  /** Whether technical research has been computed and is populated */
  hasTechnicalResearch: boolean;
  /** Whether complexity scoring has been computed */
  hasComplexityResult: boolean;
  /** Whether build pricing has been computed */
  hasBuildPricing: boolean;
  /** Number of detected complexity signals */
  complexitySignalCount: number;
  /** v1.100.6: Explicit signal resolution from structured analysis outputs */
  resolvedSignals?: ResolvedSignals;
};

// ── Banding thresholds ──────────────────────────────────────────────────────
// These are applied to the combined score (coverage + depth).

const WEAK_THRESHOLD = 25;
const STRONG_THRESHOLD = 55;

// ── Public types ────────────────────────────────────────────────────────────

export type ContextQualityBand = "weak" | "workable" | "strong";

export type ContextQualityResult = {
  score: number;
  maxScore: number;
  band: ContextQualityBand;
  confirmedSignals: string[];
  missingSignals: Array<{ key: string; label: string; prompt: string; blocker: boolean }>;
  assumptions: string[];
  rationale: string;
};

// ── Main evaluation function ────────────────────────────────────────────────

export function evaluateContextQuality(
  mergedContext: string,
  depth?: EvidenceDepthInput,
): ContextQualityResult {
  // ── Layer 1: Signal coverage ──
  const maxCoverageScore = SIGNAL_AREAS.reduce((sum, a) => sum + a.weight, 0);
  let coverageScore = 0;
  const confirmedSignals: string[] = [];
  const missingSignals: Array<{ key: string; label: string; prompt: string; blocker: boolean }> = [];
  const assumptions: string[] = [];
  let blockersMissing = 0;

  // v1.100.6: Explicit signal resolution from structured analysis outputs.
  // Blockers are resolved via typed flags, not text scanning.
  const resolved = depth?.resolvedSignals;

  for (const area of SIGNAL_AREAS) {
    const matchedInContext = area.patterns.test(mergedContext);
    const resolvedByAnalysis = resolved?.[area.key as keyof ResolvedSignals] === true;

    if (matchedInContext || resolvedByAnalysis) {
      coverageScore += area.weight;
      confirmedSignals.push(area.label);
    } else {
      missingSignals.push({
        key: area.key,
        label: area.label,
        prompt: area.missingPrompt,
        blocker: area.blocker,
      });
      if (area.blocker) blockersMissing++;
      if (area.assumption) {
        assumptions.push(area.assumption);
      }
    }
  }

  // ── Layer 2: Evidence depth boosters ──
  // These reward leads that have been actively worked, even if some
  // coverage signals are missing (e.g. "hosting" isn't mentioned but
  // research + complexity + pricing all exist).
  let depthBoost = 0;
  const depthMaxBoost = 25; // max bonus from depth signals

  if (depth) {
    if (depth.iterationCount >= 3) depthBoost += 8;
    else if (depth.iterationCount >= 1) depthBoost += 4;

    if (depth.hasTechnicalResearch) depthBoost += 5;
    if (depth.hasComplexityResult) depthBoost += 4;
    if (depth.hasBuildPricing) depthBoost += 3;

    if (depth.complexitySignalCount >= 5) depthBoost += 5;
    else if (depth.complexitySignalCount >= 3) depthBoost += 3;
  }

  depthBoost = Math.min(depthBoost, depthMaxBoost);

  // ── Combined score ──
  const maxScore = maxCoverageScore + depthMaxBoost;
  const score = coverageScore + depthBoost;

  // ── Banding ──
  // Strong requires: score threshold met AND no core blockers missing
  // (a lead can't be strong if we don't even know what type of product it is)
  let band: ContextQualityBand;
  if (score >= STRONG_THRESHOLD && blockersMissing === 0) {
    band = "strong";
  } else if (score < WEAK_THRESHOLD) {
    band = "weak";
  } else {
    band = "workable";
  }

  // ── Rationale ──
  const coveragePct = Math.round((coverageScore / maxCoverageScore) * 100);
  const depthLabel = depth
    ? `${depth.iterationCount} interaction${depth.iterationCount !== 1 ? "s" : ""}, ${depth.hasTechnicalResearch ? "research populated" : "no research"}`
    : "no depth data";

  let rationale: string;
  if (band === "strong") {
    rationale = `Strong context: ${confirmedSignals.length}/${SIGNAL_AREAS.length} signal areas confirmed (${coveragePct}%), ${depthLabel}. Enough evidence to confidently scope and propose.`;
  } else if (band === "workable") {
    const blockerNote = blockersMissing > 0
      ? ` ${blockersMissing} core area${blockersMissing !== 1 ? "s" : ""} still missing.`
      : "";
    rationale = `${confirmedSignals.length}/${SIGNAL_AREAS.length} signal areas confirmed (${coveragePct}%), ${depthLabel}.${blockerNote} Analysis can proceed with ${assumptions.length} assumption${assumptions.length !== 1 ? "s" : ""}.`;
  } else {
    rationale = `Only ${confirmedSignals.length}/${SIGNAL_AREAS.length} signal areas confirmed (${coveragePct}%). Add more detail before relying on analysis outputs.`;
  }

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
 * v1.100.6: Compute resolved signals from structured analysis outputs.
 * Each signal is resolved by checking specific typed fields — no text blob scanning.
 */
export function computeResolvedSignals(inputs: {
  /** Complexity signal keys (e.g. ["authentication_roles", "booking_system"]) */
  complexitySignalKeys: string[];
  /** Whether technical research exists and is populated */
  hasTechnicalResearch: boolean;
  /** Research recommendation strings (e.g. ["Clerk for authentication", "Supabase for database"]) */
  researchRecommendations: string[];
  /** Research assumption strings */
  researchAssumptions: string[];
  /** Brief project summary text */
  briefSummary: string;
  /** Brief recommended solution text */
  briefSolution: string;
}): ResolvedSignals {
  const cxKeys = new Set(inputs.complexitySignalKeys);
  const recsLower = inputs.researchRecommendations.map(r => r.toLowerCase()).join(" ");
  const assumeLower = inputs.researchAssumptions.map(a => a.toLowerCase()).join(" ");
  const briefLower = (inputs.briefSummary + " " + inputs.briefSolution).toLowerCase();

  // AUTH: resolved if complexity has auth signal, or research recommends auth provider
  const authProviders = ["clerk", "auth0", "supabase auth", "firebase auth", "nextauth", "lucia"];
  const authResolved =
    cxKeys.has("authentication_roles") ||
    authProviders.some(p => recsLower.includes(p)) ||
    /\b(authentication|rbac|role.based|login\s+system)\b/i.test(recsLower) ||
    /\bassume.*auth/i.test(assumeLower);

  // DATA: resolved if complexity has data signals, or research recommends database
  const dataProviders = ["supabase", "postgresql", "postgres", "neon", "planetscale", "firebase", "mongodb", "dynamodb"];
  const dataResolved =
    cxKeys.has("document_upload") ||
    cxKeys.has("workflow_states") ||
    dataProviders.some(p => recsLower.includes(p)) ||
    /\b(database|data\s*store|persist|migration|records)\b/i.test(recsLower) ||
    /\bassume.*database/i.test(assumeLower);

  // SCOPE: resolved if brief has substantial content, or enough complexity signals exist
  const scopeResolved =
    inputs.briefSummary.trim().length > 50 ||
    inputs.complexitySignalKeys.length >= 3 ||
    /\b(platform|system|portal|web\s*app|application)\b/i.test(briefLower);

  return {
    user_accounts: authResolved,
    data_storage: dataResolved,
    scope_definition: scopeResolved,
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
