import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

type ClarificationRoundInput = {
  round_number: number;
  questions: string | null;
  client_reply: string | null;
};

type AutofillFields = {
  project_summary: string;
  project_type: string;
  recommended_solution: string;
  suggested_pages: string;
  suggested_features: string;
  suggested_integrations: string;
  timeline_estimate: string;
  budget_positioning: string;
  risks_and_unknowns: string;
  follow_up_questions: string;
};

type AutofillResponse = {
  fields: AutofillFields;
  ready: boolean;
  readiness_reason: string;
};

// ── Research types (mirrored from research route for synthesis) ───────────────

type ResearchItem = {
  name: string;
  description: string;
  pricing?: string;
  relevance: 'required' | 'likely' | 'optional';
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

// ── Pricing signal types (from frontend pricing engine) ──────────────────────

type PricingSignals = {
  deliveryClass: string;
  package: string;
  priceBand: string;
  pricingFit: string;
  rationale: string;
  confidence: string;
  isCustomSplit: boolean;
  commercialPosture?: string;
  fullScopeEstimate?: string;
  phase1Path?: string;
};

// ── Complexity signal types (from Complexity Engine) ─────────────────────────

type ComplexitySignals = {
  complexity_score: number;
  complexity_class: string;
  detected_signals: { key: string; weight: number; evidence: string }[];
  build_components: { key: string; label: string; days_low: number; days_high: number }[];
  estimated_days_low: number;
  estimated_days_high: number;
  complexity_rationale: string;
};

// ── Research synthesis: converts raw research into concise prompt context ─────

const CATEGORY_LABELS: Record<string, string> = {
  integrations: 'Integrations',
  infrastructure: 'Infrastructure & hosting',
  third_party_services: 'Third-party services',
  compliance: 'Compliance',
  operating_cost_estimate: 'Operating costs',
};

function synthesiseResearch(research: TechnicalResearch): string {
  const lines: string[] = ['## Prior technical research'];

  // Research summary — the most important signal
  if (research.summary) {
    lines.push(research.summary);
    lines.push('');
  }

  // Stack recommendations — direct, actionable
  if (research.recommendations?.length > 0) {
    lines.push('**Stack direction:** ' + research.recommendations.join('; '));
    lines.push('');
  }

  // Category summaries + required/likely items (skip optional to avoid bloat)
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const cat = research[key as keyof TechnicalResearch] as ResearchCategory | undefined;
    if (!cat) continue;
    const relevantItems = (cat.items ?? []).filter((i) => i.relevance === 'required' || i.relevance === 'likely');
    if (!cat.summary && relevantItems.length === 0) continue;

    const itemList = relevantItems.map((i) => {
      const parts = [i.name];
      if (i.pricing) parts.push(`(${i.pricing})`);
      return parts.join(' ');
    });

    if (cat.summary && itemList.length > 0) {
      lines.push(`**${label}:** ${cat.summary} — ${itemList.join(', ')}`);
    } else if (cat.summary) {
      lines.push(`**${label}:** ${cat.summary}`);
    } else {
      lines.push(`**${label}:** ${itemList.join(', ')}`);
    }
  }

  // Unknowns — the prompt generator should account for these
  if (research.unknowns?.length > 0) {
    lines.push('');
    lines.push('**Open questions from research:** ' + research.unknowns.join('; '));
  }

  return lines.join('\n');
}

// ── Pricing synthesis: converts pricing engine output into prompt context ─────

function synthesisePricing(pricing: PricingSignals): string {
  const lines: string[] = ['## Pricing & complexity intelligence'];

  lines.push(`**Delivery class:** ${pricing.deliveryClass}`);
  lines.push(`**Recommended package:** ${pricing.package} (${pricing.priceBand})`);
  lines.push(`**Budget fit:** ${pricing.pricingFit}`);

  if (pricing.isCustomSplit) {
    if (pricing.commercialPosture) lines.push(`**Commercial posture:** ${pricing.commercialPosture}`);
    if (pricing.fullScopeEstimate) lines.push(`**Full scope estimate:** ${pricing.fullScopeEstimate}`);
    if (pricing.phase1Path) lines.push(`**Phase 1 / MVP path:** ${pricing.phase1Path}`);
  }

  if (pricing.rationale) {
    lines.push(`**Rationale:** ${pricing.rationale}`);
  }

  return lines.join('\n');
}

// ── Complexity synthesis: converts complexity engine output into prompt context ─

function synthesiseComplexity(cx: ComplexitySignals): string {
  const lines: string[] = ['## Complexity assessment'];

  lines.push(`**Score:** ${cx.complexity_score}/100 (${cx.complexity_class.replace(/_/g, ' ')})`);
  lines.push(`**Estimated effort:** ${cx.estimated_days_low}–${cx.estimated_days_high} days`);

  if (cx.detected_signals.length > 0) {
    const signalNames = cx.detected_signals.map((s) => `${s.key.replace(/_/g, ' ')} (+${s.weight})`);
    lines.push(`**Detected signals:** ${signalNames.join(', ')}`);
  }

  if (cx.build_components.length > 0) {
    const compNames = cx.build_components.map((c) => `${c.label} (${c.days_low}–${c.days_high}d)`);
    lines.push(`**Build components:** ${compNames.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Validate that complexity signals have enough content to be useful.
 */
function isUsableComplexity(data: unknown): data is ComplexitySignals {
  if (!data || typeof data !== 'object') return false;
  const c = data as Record<string, unknown>;
  if (typeof c.complexity_score !== 'number') return false;
  if (c.complexity_score === 0 && (!Array.isArray(c.detected_signals) || (c.detected_signals as unknown[]).length === 0)) return false;
  return true;
}

/**
 * Validate that an object looks like a TechnicalResearch with enough content
 * to be useful. Returns false for empty/weak-scope research.
 */
function isUsableResearch(data: unknown): data is TechnicalResearch {
  if (!data || typeof data !== 'object') return false;
  const r = data as Record<string, unknown>;
  if (typeof r.summary !== 'string') return false;
  // Weak-scope research has a specific summary pattern — skip it
  if (r.summary.startsWith('Insufficient project scope')) return false;
  return true;
}

/**
 * Validate that pricing signals have enough content to be useful.
 */
function isUsablePricing(data: unknown): data is PricingSignals {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;
  if (typeof p.deliveryClass !== 'string' || p.deliveryClass === 'Needs review') return false;
  if (typeof p.package !== 'string' || p.package === 'Needs review') return false;
  return true;
}

const ENGAGEMENT_LABELS: Record<string, string> = {
  build_new: 'Build something new',
  improve_existing: 'Improve an existing website or system',
  tech_advice: 'Technology advice / strategic guidance',
  branding: 'Branding or design work',
  ongoing_support: 'Ongoing support',
};

const BUDGET_LABELS: Record<string, string> = {
  under_3k: 'Under \u20ac3k',
  '3k_5k': '\u20ac3k\u2013\u20ac5k',
  '5k_15k': '\u20ac5k\u2013\u20ac15k',
  '15k_40k': '\u20ac15k\u2013\u20ac40k',
  '40k_plus': '\u20ac40k+',
  not_sure: 'Not sure yet',
};

const TIMELINE_LABELS: Record<string, string> = {
  asap: 'As soon as possible',
  '1_3_months': '1\u20133 months',
  '3_6_months': '3\u20136 months',
  planning: 'Planning ahead',
};

function buildPrompt(
  lead: Record<string, unknown>,
  leadDetails: Record<string, unknown> | null,
  scopingReply: string,
  clarificationRounds?: ClarificationRoundInput[],
): string {
  const lines: string[] = [];

  lines.push('## Client details');
  lines.push(`Name: ${lead.contact_name ?? 'Unknown'}`);
  if (lead.company_name) lines.push(`Company: ${lead.company_name}`);
  if (lead.company_website) lines.push(`Website: ${lead.company_website}`);
  if (lead.engagement_type) {
    lines.push(`Engagement type: ${ENGAGEMENT_LABELS[lead.engagement_type as string] ?? lead.engagement_type}`);
  }
  if (lead.budget) {
    lines.push(`Budget range: ${BUDGET_LABELS[lead.budget as string] ?? lead.budget}`);
  }
  if (lead.timeline) {
    lines.push(`Timeline: ${TIMELINE_LABELS[lead.timeline as string] ?? lead.timeline}`);
  }
  lines.push('');

  // Clarifiers
  const clarifiers = (leadDetails?.clarifier_answers ?? null) as Record<string, string> | null;
  if (clarifiers && Object.keys(clarifiers).length > 0) {
    lines.push('## Intake clarifiers');
    for (const [k, v] of Object.entries(clarifiers)) {
      lines.push(`- ${k.replace(/_/g, ' ')}: ${v}`);
    }
    lines.push('');
  }

  // Success definition
  if (leadDetails?.success_definition) {
    lines.push('## Success definition');
    lines.push(String(leadDetails.success_definition));
    lines.push('');
  }

  // Scoring
  if (lead.total_score != null) {
    lines.push('## Internal scoring');
    lines.push(`Total: ${Number(lead.total_score).toFixed(1)}/5`);
    if (lead.clarity_score != null) lines.push(`Clarity: ${lead.clarity_score}/5`);
    if (lead.alignment_score != null) lines.push(`Alignment: ${lead.alignment_score}/5`);
    if (lead.complexity_score != null) lines.push(`Complexity: ${lead.complexity_score}/5`);
    if (lead.authority_score != null) lines.push(`Authority: ${lead.authority_score}/5`);
    lines.push('');
  }

  // Scoping reply
  lines.push("## Client's scoping reply");
  lines.push(scopingReply.trim());
  lines.push('');

  // Clarification rounds
  if (clarificationRounds && clarificationRounds.length > 0) {
    lines.push('## Clarification rounds');
    for (const round of clarificationRounds) {
      lines.push(`### Round ${round.round_number}`);
      if (round.questions) {
        lines.push('**Questions asked:**');
        lines.push(round.questions);
      }
      if (round.client_reply) {
        lines.push('**Client reply:**');
        lines.push(round.client_reply);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ── Consultant Brief Engine: system prompt ───────────────────────────────────
// This prompt drives the synthesis layer that produces consultant-grade briefs
// from upstream workflow outputs (intake, research, pricing signals).

const SYSTEM_PROMPT = `You are a senior technical consultant at OTwoOne, a web consultancy in Ireland. Your role is to produce a structured, consultant-grade project brief by synthesising all available upstream intelligence.

You will receive some or all of the following inputs:
1. Client context (intake details, scoping reply, clarification rounds)
2. Prior technical research (stack direction, integrations, infrastructure, compliance, costs)
3. Complexity assessment (0–100 score, complexity class, detected signals, build components, effort estimate)
4. Pricing & commercial intelligence (delivery class, recommended package, budget fit, commercial posture)

Your job is to SYNTHESISE these into a coherent, commercially grounded brief — not to repeat raw form data.

When prior technical research is present:
- Use it to inform recommended_solution (align with researched stack direction)
- Reference specific researched services/tools in suggested_integrations rather than guessing
- Factor researched cost estimates into budget_positioning
- Incorporate researched risks and unknowns into risks_and_unknowns
- Let infrastructure findings shape timeline_estimate where relevant

When a complexity assessment is present:
- Use the complexity class and score to calibrate the scale of recommended_solution (e.g. a 75/100 system_platform needs phased delivery, not a single sprint)
- Reference detected signals and build components when describing suggested_features
- Use the effort estimate to ground timeline_estimate (e.g. if 30–40 days, that implies 6–8 weeks minimum)
- Factor build components into risks_and_unknowns where appropriate (e.g. booking system + API integration = integration testing risk)

When pricing & commercial intelligence is present:
- Align project_type with the determined delivery class (e.g. if delivery class is "Custom workflow build", do not classify as "brochure site")
- Ground budget_positioning in the pricing engine's recommendation — if the engine says budget is "Tight" for the recommended scope, say so clearly
- If a phased/MVP approach is recommended, reflect this in recommended_solution and timeline_estimate
- If a custom quote is required, note this in budget_positioning rather than guessing a number
- Use the delivery class to calibrate the ambition level of suggested_features and suggested_pages

When inputs are absent, produce the brief using only what is available. Never fabricate research findings or pricing data.

SYNTHESIS RULES:
- Write as a consultant who has reviewed all evidence, not as a form processor
- project_summary must describe the actual business need and proposed solution, not parrot intake form values
- recommended_solution must be specific to this project — include stack choices, architecture direction, and phasing if relevant
- suggested_integrations must name specific tools/services, not generic categories
- budget_positioning must be commercially honest — if scope exceeds budget, say so with a constructive path forward
- risks_and_unknowns must include delivery risks, not just client information gaps
- Avoid outputs like "no; just_me; web_app" or other raw form fragments — always translate into natural consultant language

Respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.

JSON schema:
{
  "fields": {
    "project_summary": "2\u20133 sentence overview synthesising the business need and proposed direction",
    "project_type": "delivery classification aligned with complexity analysis (e.g. custom workflow build, growth website, ops platform)",
    "recommended_solution": "specific technical and strategic recommendation for what OTwoOne should build, including stack direction and phasing if applicable",
    "suggested_pages": "pages/sections/views to include, appropriate to the delivery class",
    "suggested_features": "key features and functionality, calibrated to budget and complexity",
    "suggested_integrations": "specific third-party tools, APIs, or services — from research where available",
    "timeline_estimate": "realistic delivery window accounting for complexity and phasing",
    "budget_positioning": "commercially grounded assessment of budget vs scope, with constructive recommendations",
    "risks_and_unknowns": "delivery risks, technical unknowns, commercial caveats, and unresolved client questions",
    "follow_up_questions": "specific questions to ask the client before proceeding (empty string if none needed)"
  },
  "ready": true/false,
  "readiness_reason": "brief explanation of why or why not ready for proposal"
}

Rules:
- Keep each field concise and actionable
- Write for an internal operator who will use this to build a proposal
- Set "ready" to true only if scope is clear enough to write a proposal without further clarification
- Set "ready" to false if key information is missing (e.g. no pages specified, unclear requirements, no timeline)
- When not ready, ensure follow_up_questions contains the specific questions needed
- If clarification rounds are provided, incorporate the new information and re-assess readiness`;

/**
 * Extract and parse the first JSON object from a Claude response that may
 * include markdown code fences or leading/trailing explanatory text.
 */
function extractAndParseJSON(raw: string): AutofillResponse {
  let text = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Try direct parse first (covers clean responses and fence-stripped ones)
  try {
    return JSON.parse(text) as AutofillResponse;
  } catch {
    // Fall through to extraction
  }

  // Extract the first top-level JSON object via brace matching
  const start = text.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON object found in response');
  }
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  if (end === -1) {
    throw new Error('Unterminated JSON object in response');
  }

  return JSON.parse(text.slice(start, end + 1)) as AutofillResponse;
}

/**
 * POST /api/hub/leads/[id]/brief/autofill
 *
 * Consultant Brief Engine. Synthesises a structured, consultant-grade brief
 * from all available upstream workflow outputs:
 * - client intake context + clarification rounds
 * - prior technical research (from lead_briefs)
 * - pricing & complexity signals (from frontend pricing engine)
 *
 * Body:
 *   scoping_reply?: string
 *   merged_context?: string
 *   clarification_rounds?: Array<{ round_number, questions, client_reply }>
 *   pricing_signals?: PricingSignals (from frontend pricing engine)
 *   complexity_signals?: ComplexitySignals (from Complexity Engine)
 *
 * Returns { fields, ready, readiness_reason }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  let body: {
    scoping_reply?: string;
    merged_context?: string;
    clarification_rounds?: ClarificationRoundInput[];
    pricing_signals?: PricingSignals;
    complexity_signals?: ComplexitySignals;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const scopingReply = body.scoping_reply?.trim();
  const mergedContext = body.merged_context?.trim();

  if (!scopingReply && !mergedContext) {
    return NextResponse.json({ error: 'scoping_reply or merged_context is required.' }, { status: 400 });
  }

  // Load lead context
  const { data: lead, error: leadErr } = await supabaseServer
    .from('leads')
    .select('contact_name, company_name, company_website, engagement_type, budget, timeline, total_score, clarity_score, alignment_score, complexity_score, authority_score')
    .eq('id', id)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const { data: details } = await supabaseServer
    .from('lead_details')
    .select('clarifier_answers, success_definition')
    .eq('lead_id', id)
    .maybeSingle();

  // ── Retrieve prior technical research if available ──────────────────────────
  let researchContext = '';
  const { data: briefRow } = await supabaseServer
    .from('lead_briefs')
    .select('technical_research')
    .eq('lead_id', id)
    .maybeSingle();

  if (briefRow?.technical_research && isUsableResearch(briefRow.technical_research)) {
    researchContext = synthesiseResearch(briefRow.technical_research as TechnicalResearch);
    console.log('[autofill] Injecting prior technical research into prompt.');
  }

  // ── Synthesise pricing signals if provided ─────────────────────────────────
  let pricingContext = '';
  if (body.pricing_signals && isUsablePricing(body.pricing_signals)) {
    pricingContext = synthesisePricing(body.pricing_signals);
    console.log('[autofill] Injecting pricing signals into prompt.');
  }

  // ── Synthesise complexity signals if provided ─────────────────────────────
  let complexityContext = '';
  if (body.complexity_signals && isUsableComplexity(body.complexity_signals)) {
    complexityContext = synthesiseComplexity(body.complexity_signals);
    console.log('[autofill] Injecting complexity assessment into prompt.');
  }

  // Prefer merged context (includes all sources); fall back to legacy scoping reply
  let userPrompt: string;
  if (mergedContext) {
    userPrompt = mergedContext;
    // Append clarification rounds if not already in merged context
    if (body.clarification_rounds && body.clarification_rounds.length > 0) {
      const roundLines = body.clarification_rounds.map((r) => {
        const parts: string[] = [`### Round ${r.round_number}`];
        if (r.questions) { parts.push('**Questions asked:**'); parts.push(r.questions); }
        if (r.client_reply) { parts.push('**Client reply:**'); parts.push(r.client_reply); }
        return parts.join('\n');
      });
      userPrompt += '\n\n## Clarification rounds\n' + roundLines.join('\n\n');
    }
  } else {
    userPrompt = buildPrompt(
      lead,
      details,
      scopingReply!,
      body.clarification_rounds,
    );
  }

  // ── Append upstream workflow outputs (research + pricing + complexity) ────
  // These are appended after client context so the AI sees them as structured
  // intelligence to synthesise into the brief, not raw context to echo.
  if (researchContext) {
    userPrompt += '\n\n' + researchContext;
  }
  if (complexityContext) {
    userPrompt += '\n\n' + complexityContext;
  }
  if (pricingContext) {
    userPrompt += '\n\n' + pricingContext;
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed: AutofillResponse;
    try {
      parsed = extractAndParseJSON(rawText);
    } catch (parseErr) {
      console.error('[autofill] Failed to parse AI response.');
      console.error('[autofill] Raw response:', rawText);
      console.error('[autofill] Parse error:', parseErr instanceof Error ? parseErr.message : parseErr);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 502 },
      );
    }

    // Validate shape
    const requiredFields: (keyof AutofillFields)[] = [
      'project_summary', 'project_type', 'recommended_solution',
      'suggested_pages', 'suggested_features', 'suggested_integrations',
      'timeline_estimate', 'budget_positioning', 'risks_and_unknowns',
      'follow_up_questions',
    ];
    const missingKeys = requiredFields.filter((k) => !(k in parsed.fields));
    if (!parsed.fields || typeof parsed.ready !== 'boolean') {
      console.error('[autofill] Unexpected response shape:', JSON.stringify(parsed).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected AI response format. Please try again.' },
        { status: 502 },
      );
    }
    if (missingKeys.length > 0) {
      console.error('[autofill] Missing required fields:', missingKeys.join(', '));
      return NextResponse.json(
        { error: `AI response missing fields: ${missingKeys.join(', ')}. Please try again.` },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
