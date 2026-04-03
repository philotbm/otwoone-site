// ============================================================================
// Proposal Autofill Builder
// v1.80.2 — Prompt Hardening
//
// Consumes a ProposalSourcePackage and generates structured proposal sections
// via Claude AI. Produces a partial Proposal patch with:
//   - Text fields: executive_summary, problem_statement, recommended_solution,
//     timeline_summary, balance_terms
//   - JSON arrays: scope_items, deliverables, timeline_phases, assumptions,
//     exclusions, next_steps
//
// Design principles:
// - Structured-first: all array fields output as typed JSON, not prose blobs
// - Source-driven: clarification rounds, technical research, existing brief
//   analysis are all first-class inputs
// - Safe overwrite: only fills fields that are currently empty/default
// - Readiness-aware: warns when source inputs are weak
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import type { ProposalSourcePackage, ScopeItem, Deliverable, TimelinePhase } from '@/lib/proposalTypes';

// ── Autofill output shape ──────────────────────────────────────────────────

export type ProposalAutofillResult = {
  fields: {
    executive_summary: string;
    problem_statement: string;
    recommended_solution: string;
    scope_items: ScopeItem[];
    deliverables: Deliverable[];
    timeline_summary: string;
    timeline_phases: TimelinePhase[];
    assumptions: string[];
    exclusions: string[];
    next_steps: string[];
    balance_terms: string;
  };
  confidence: 'high' | 'medium' | 'low';
  confidence_reason: string;
};

// ── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior consultant at StudioFlow, an Irish web consultancy. Your job is to draft client-facing proposal sections that are commercially persuasive, specific to the client's situation, and delivery-safe.

You will receive a ProposalSourcePackage containing:
- Client identity (name, company, role, decision authority)
- Intake context (engagement type, budget, timeline, success definition, current tools)
- Clarifier answers and clarification round Q&A
- Brief analysis (project summary, recommended solution, suggested pages/features/integrations, timeline, budget positioning, risks)
- Technical research (if available)
- Build pricing (recommended price, day rate, confidence range)
- Running costs (itemised monthly costs)
- Scope readiness signal

WRITING PRIORITIES — follow this order in every field:
1. The client's business objectives — what they want to achieve, not what we want to build
2. The practical problem being solved — frame from the client's perspective
3. The recommended approach and why it fits their situation specifically
4. The business value and delivery clarity — what they get, when, and why it matters

Do not simply restate source notes. Synthesise them into clear, commercially grounded proposal language that reads as if a senior consultant wrote it after reviewing the client's situation in depth.

TONE AND LANGUAGE:
- Write for the client decision-maker, not for a technical audience (unless the section specifically requires it)
- Be direct, specific, and concrete — name the client's company, reference their stated goals, cite their industry context
- Avoid vague or generic agency phrasing. Do NOT use phrases like:
  "tailored solution", "innovative digital experience", "enhance your online presence",
  "cutting-edge platform", "seamless integration", "best-in-class", "state-of-the-art",
  "leverage your brand", "holistic approach", "digital transformation journey"
  unless the wording is genuinely justified by the source inputs
- Prefer plain, confident language: "We will build X so that Y" over "We propose to deliver a bespoke X solution"

SCOPE DISCIPLINE — this is critical:
- ONLY include deliverables, integrations, services, pages, features, and timeline items that are directly supported by the source data
- Do NOT invent capabilities, integrations, or project complexity beyond what the sources describe
- Do NOT imply content creation, copywriting, photography, or media production unless the sources explicitly include it
- Do NOT imply advanced SEO services, paid advertising, social media management, or ongoing marketing unless supported
- Do NOT imply custom API integrations, third-party platform builds, or data migration unless the sources describe them
- Do NOT imply ongoing maintenance, support retainers, or post-launch services unless the running costs or brief explicitly include them
- Where source details are incomplete or vague, use assumptions and exclusions to maintain clarity — do not fill gaps with invented scope
- If the sources mention a feature or integration only briefly, include it at the appropriate scale — do not inflate it into a major deliverable
- Timeline phases must reflect realistic work for the described scope and price point — do not pad with unnecessary phases

OUTPUT FORMAT — Respond with valid JSON only:
{
  "fields": {
    "executive_summary": "2-4 sentences positioning StudioFlow's value for this specific project. Open with the client's business goal (not StudioFlow's capabilities). Address the client by company name. Reference the business problem and how the proposed work addresses it.",
    "problem_statement": "2-3 sentences describing the client's current situation and what needs to change. Write from the client's perspective — what is costing them time, money, or opportunity today? Do not describe what StudioFlow will do here.",
    "recommended_solution": "3-5 sentences describing what StudioFlow will build and why this approach fits the client's situation. Include technology choices only where the sources support them. Explain the business rationale, not just the technical spec.",
    "scope_items": [{"label": "Item name", "description": "What this covers — must be grounded in source data"}],
    "deliverables": [{"label": "Deliverable name", "description": "What the client receives — only items supported by the sources"}],
    "timeline_summary": "1-2 sentence overview of the delivery approach and expected duration, grounded in the pricing/brief data.",
    "timeline_phases": [{"phase": "Phase name", "duration": "e.g. 2 weeks", "description": "What happens — must reflect actual scope"}],
    "assumptions": ["Assumption about what the client provides or what conditions apply"],
    "exclusions": ["Item explicitly out of scope — be specific about what is NOT included"],
    "next_steps": ["Realistic next step — e.g. approve proposal, pay deposit, schedule kickoff"],
    "balance_terms": "Payment terms for the balance amount"
  },
  "confidence": "high|medium|low",
  "confidence_reason": "Why this confidence level"
}

FIELD-SPECIFIC RULES:
- executive_summary: Lead with the client's goal. Do not open with "StudioFlow is pleased to..." or similar. The client should see their own objectives reflected first.
- problem_statement: Describe the client's pain, not StudioFlow's opportunity. Use specifics from intake/scoping/clarification data.
- recommended_solution: Explain WHY this approach fits, not just WHAT it is. Connect technology choices to business outcomes.
- scope_items: 4-8 items. Every item must trace back to something in the source data. If you cannot point to a source input justifying an item, do not include it.
- deliverables: 3-6 items. These are concrete things the client receives (a website, a dashboard, documentation, training). Do not list process steps as deliverables.
- timeline_phases: 2-5 phases. Duration must be realistic for the scope and price. A €3k brochure site does not need a 4-phase plan.
- assumptions: 3-6 items. Include practical project assumptions (content provision timelines, hosting decisions, access requirements). Use this to handle gaps in the source data honestly.
- exclusions: 2-4 items. Be specific. Always exclude content creation and ongoing services unless the sources explicitly include them. This protects delivery scope.
- next_steps: 2-4 items. Keep realistic: approve proposal, pay deposit, kickoff call. Do not invent elaborate onboarding processes.
- balance_terms: Default "Due on project completion" unless pricing data suggests phased payments for larger projects.

CALIBRATION:
- If build pricing is present, calibrate scope ambition to the price point. A €2,500 project gets a focused scope; a €25,000 project gets a comprehensive one.
- If running costs are present, reference key services in assumptions where relevant.
- If source readiness is low (<50%), keep scope conservative and use more assumptions/exclusions to flag gaps.
- Reference specific technologies from brief/research where available, but do not introduce technologies not mentioned in the sources.

CONFIDENCE LEVELS:
- high: Strong source data — brief analysis complete, pricing available, scope clear
- medium: Partial sources — some brief fields missing or no pricing, but enough to draft
- low: Minimal sources — mostly working from intake data only, draft will need heavy editing

Respond with valid JSON only. No markdown fences, no explanation outside JSON.`;

// ── Build context prompt from sources ──────────────────────────────────────

function buildSourcePrompt(sources: ProposalSourcePackage): string {
  const lines: string[] = [];

  lines.push('## Client Identity');
  lines.push(`Contact: ${sources.contact_name ?? 'Unknown'}`);
  lines.push(`Email: ${sources.contact_email}`);
  if (sources.company_name) lines.push(`Company: ${sources.company_name}`);
  if (sources.company_website) lines.push(`Website: ${sources.company_website}`);
  if (sources.role) lines.push(`Role: ${sources.role}`);
  if (sources.decision_authority) lines.push(`Decision authority: ${sources.decision_authority}`);
  lines.push('');

  lines.push('## Intake Context');
  if (sources.engagement_type) lines.push(`Engagement type: ${sources.engagement_type}`);
  if (sources.budget) lines.push(`Budget range: ${sources.budget}`);
  if (sources.timeline) lines.push(`Timeline: ${sources.timeline}`);
  if (sources.success_definition) {
    lines.push(`Success definition: ${sources.success_definition}`);
  }
  if (sources.current_tools) {
    lines.push(`Current tools: ${sources.current_tools}`);
  }
  lines.push('');

  // Clarifier answers
  if (sources.clarifier_answers && Object.keys(sources.clarifier_answers).length > 0) {
    lines.push('## Intake Clarifiers');
    for (const [k, v] of Object.entries(sources.clarifier_answers)) {
      lines.push(`- ${k.replace(/_/g, ' ')}: ${v}`);
    }
    lines.push('');
  }

  // Scoping reply
  if (sources.scoping_reply) {
    lines.push('## Client Scoping Reply');
    lines.push(sources.scoping_reply);
    lines.push('');
  }

  // Clarification rounds
  if (sources.clarification_rounds.length > 0) {
    lines.push('## Clarification Rounds');
    for (const round of sources.clarification_rounds) {
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

  // Brief analysis
  if (sources.project_summary || sources.recommended_solution) {
    lines.push('## Brief Analysis');
    if (sources.project_summary) lines.push(`Project summary: ${sources.project_summary}`);
    if (sources.project_type) lines.push(`Project type: ${sources.project_type}`);
    if (sources.recommended_solution) lines.push(`Recommended solution: ${sources.recommended_solution}`);
    if (sources.suggested_pages) lines.push(`Suggested pages: ${sources.suggested_pages}`);
    if (sources.suggested_features) lines.push(`Suggested features: ${sources.suggested_features}`);
    if (sources.suggested_integrations) lines.push(`Suggested integrations: ${sources.suggested_integrations}`);
    if (sources.timeline_estimate) lines.push(`Timeline estimate: ${sources.timeline_estimate}`);
    if (sources.budget_positioning) lines.push(`Budget positioning: ${sources.budget_positioning}`);
    if (sources.risks_and_unknowns) lines.push(`Risks and unknowns: ${sources.risks_and_unknowns}`);
    if (sources.follow_up_questions) lines.push(`Follow-up questions: ${sources.follow_up_questions}`);
    lines.push('');
  }

  // Technical research
  if (sources.technical_research) {
    lines.push('## Technical Research');
    lines.push(JSON.stringify(sources.technical_research, null, 2));
    lines.push('');
  }

  // Build pricing
  if (sources.build_pricing) {
    lines.push('## Build Pricing');
    lines.push(`Recommended build price: €${sources.build_pricing.recommended_build_price.toLocaleString()}`);
    lines.push(`Build days: ${sources.build_pricing.recommended_build_days}`);
    lines.push(`Day rate: €${sources.build_pricing.day_rate}`);
    lines.push(`Confidence range: €${sources.build_pricing.confidence_range_low.toLocaleString()} – €${sources.build_pricing.confidence_range_high.toLocaleString()}`);
    if (sources.build_pricing.client_budget_low != null) {
      lines.push(`Client budget: €${sources.build_pricing.client_budget_low.toLocaleString()} – €${(sources.build_pricing.client_budget_high ?? sources.build_pricing.client_budget_low).toLocaleString()}`);
    }
    lines.push(`Commercial strategy: ${sources.build_pricing.commercial_strategy}`);
    lines.push('');
  }

  // Running costs
  if (sources.running_costs) {
    lines.push('## Running Costs (Monthly)');
    for (const item of sources.running_costs.items) {
      lines.push(`- ${item.name}: €${item.low}–€${item.high}/mo (${item.relevance})`);
    }
    lines.push(`Support retainer: €${sources.running_costs.support_retainer}/mo`);
    lines.push(`Total range: €${sources.running_costs.total_with_retainer_low}–€${sources.running_costs.total_with_retainer_high}/mo (incl. retainer)`);
    lines.push('');
  }

  // Existing proposal draft (optional input)
  if (sources.existing_proposal_draft) {
    lines.push('## Existing Draft Notes');
    lines.push(sources.existing_proposal_draft);
    lines.push('');
  }

  // Readiness
  lines.push('## Source Readiness');
  lines.push(`Score: ${sources.readiness.score}/${sources.readiness.total} (${sources.readiness.percent}%)`);
  for (const check of sources.readiness.checks) {
    lines.push(`- ${check.ok ? '✓' : '✗'} ${check.label}`);
  }

  return lines.join('\n');
}

// ── Main autofill function ─────────────────────────────────────────────────

export async function generateProposalAutofill(
  sources: ProposalSourcePackage,
): Promise<ProposalAutofillResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const anthropic = new Anthropic({ apiKey });
  const userPrompt = buildSourcePrompt(sources);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return parseAutofillResponse(rawText);
}

// ── Response parsing ───────────────────────────────────────────────────────

function parseAutofillResponse(raw: string): ProposalAutofillResult {
  let text = raw.trim();

  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Try direct parse
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // Extract first JSON object via brace matching
    const start = text.indexOf('{');
    if (start === -1) throw new Error('No JSON object found in autofill response');
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      if (depth === 0) { end = i; break; }
    }
    if (end === -1) throw new Error('Unterminated JSON object in autofill response');
    parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  }

  // Validate shape
  const fields = parsed.fields as Record<string, unknown> | undefined;
  if (!fields || typeof fields !== 'object') {
    throw new Error('Autofill response missing "fields" object');
  }

  const requiredTextFields = ['executive_summary', 'problem_statement', 'recommended_solution', 'timeline_summary'];
  for (const f of requiredTextFields) {
    if (typeof fields[f] !== 'string') {
      fields[f] = '';
    }
  }

  const requiredArrayFields = ['scope_items', 'deliverables', 'timeline_phases', 'assumptions', 'exclusions', 'next_steps'];
  for (const f of requiredArrayFields) {
    if (!Array.isArray(fields[f])) {
      fields[f] = [];
    }
  }

  if (typeof fields.balance_terms !== 'string') {
    fields.balance_terms = 'Due on project completion';
  }

  const confidence = (['high', 'medium', 'low'] as const).includes(parsed.confidence as 'high' | 'medium' | 'low')
    ? (parsed.confidence as 'high' | 'medium' | 'low')
    : 'low';

  return {
    fields: {
      executive_summary: fields.executive_summary as string,
      problem_statement: fields.problem_statement as string,
      recommended_solution: fields.recommended_solution as string,
      scope_items: fields.scope_items as ScopeItem[],
      deliverables: fields.deliverables as Deliverable[],
      timeline_summary: fields.timeline_summary as string,
      timeline_phases: fields.timeline_phases as TimelinePhase[],
      assumptions: fields.assumptions as string[],
      exclusions: fields.exclusions as string[],
      next_steps: fields.next_steps as string[],
      balance_terms: fields.balance_terms as string,
    },
    confidence,
    confidence_reason: typeof parsed.confidence_reason === 'string' ? parsed.confidence_reason : 'No reason provided',
  };
}
