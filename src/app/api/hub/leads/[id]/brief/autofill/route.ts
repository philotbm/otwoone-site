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

const SYSTEM_PROMPT = `You are a senior technical consultant at OTwoOne, a web consultancy in Ireland. You analyse client scoping replies and clarification responses to produce structured project briefs.

You will receive client details, their scoping reply, and optionally clarification round Q&A. You may also receive a "Prior technical research" section containing stack recommendations, integration findings, infrastructure direction, compliance notes, and cost estimates produced by an earlier research step.

When prior technical research is present:
- Use it to inform recommended_solution (align with researched stack direction)
- Reference specific researched services/tools in suggested_integrations rather than guessing
- Factor researched cost estimates into budget_positioning
- Incorporate researched risks and unknowns into risks_and_unknowns
- Let infrastructure findings shape timeline_estimate where relevant
- Do NOT blindly copy research \u2014 synthesise it into your brief recommendations

When prior technical research is absent, produce the brief using only the client context provided.

Respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.

JSON schema:
{
  "fields": {
    "project_summary": "2\u20133 sentence overview of what the client needs",
    "project_type": "e.g. brochure site, web app, e-commerce, landing page, redesign",
    "recommended_solution": "what OTwoOne should build and how",
    "suggested_pages": "list of pages/sections to include",
    "suggested_features": "key features and functionality",
    "suggested_integrations": "third-party tools, APIs, or services to integrate",
    "timeline_estimate": "realistic delivery window",
    "budget_positioning": "where this sits relative to stated budget and what is achievable",
    "risks_and_unknowns": "anything unclear, missing, or risky",
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
 * Hub-protected (middleware). Calls Claude to auto-fill structured brief
 * fields from the client's scoping reply, optional clarification rounds,
 * and prior technical research when available.
 *
 * Body:
 *   scoping_reply: string (required)
 *   clarification_rounds?: Array<{ round_number, questions, client_reply }>
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

  let body: { scoping_reply?: string; merged_context?: string; clarification_rounds?: ClarificationRoundInput[] };
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

  // ── Append synthesised research to prompt (research-aware when available) ──
  if (researchContext) {
    userPrompt += '\n\n' + researchContext;
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
