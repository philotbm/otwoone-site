import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

// ── Model constant — easy to upgrade independently of autofill ───────────────
const RESEARCH_MODEL = 'claude-haiku-4-5-20251001';

// ── Research types ───────────────────────────────────────────────────────────

type ResearchItem = {
  name: string;
  description: string;
  pricing?: string;
  docs_url?: string;
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

// ── JSON extraction (mirrors autofill/route.ts pattern) ──────────────────────

function extractAndParseJSON(raw: string): TechnicalResearch {
  let text = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(text) as TechnicalResearch;
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

  return JSON.parse(text.slice(start, end + 1)) as TechnicalResearch;
}

// ── Strict runtime validation ────────────────────────────────────────────────

const VALID_RELEVANCE = new Set(['required', 'likely', 'optional']);
const CATEGORY_KEYS: (keyof Pick<TechnicalResearch, 'integrations' | 'infrastructure' | 'third_party_services' | 'compliance' | 'operating_cost_estimate'>)[] = [
  'integrations', 'infrastructure', 'third_party_services', 'compliance', 'operating_cost_estimate',
];

function validateResearch(data: unknown): { valid: true; research: TechnicalResearch } | { valid: false; reason: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Response is not an object' };
  }

  const d = data as Record<string, unknown>;

  // Top-level fields
  if (typeof d.summary !== 'string') return { valid: false, reason: 'summary must be a string' };
  if (!Array.isArray(d.recommendations) || !d.recommendations.every((r: unknown) => typeof r === 'string')) {
    return { valid: false, reason: 'recommendations must be an array of strings' };
  }
  if (!Array.isArray(d.assumptions) || !d.assumptions.every((a: unknown) => typeof a === 'string')) {
    return { valid: false, reason: 'assumptions must be an array of strings' };
  }
  if (!Array.isArray(d.unknowns) || !d.unknowns.every((u: unknown) => typeof u === 'string')) {
    return { valid: false, reason: 'unknowns must be an array of strings' };
  }

  // Category validation
  for (const key of CATEGORY_KEYS) {
    const cat = d[key];
    if (!cat || typeof cat !== 'object') {
      return { valid: false, reason: `${key} must be an object` };
    }
    const c = cat as Record<string, unknown>;
    if (typeof c.summary !== 'string') {
      return { valid: false, reason: `${key}.summary must be a string` };
    }
    if (!Array.isArray(c.items)) {
      return { valid: false, reason: `${key}.items must be an array` };
    }
    for (let i = 0; i < c.items.length; i++) {
      const item = c.items[i] as Record<string, unknown>;
      if (!item || typeof item !== 'object') {
        return { valid: false, reason: `${key}.items[${i}] must be an object` };
      }
      if (typeof item.name !== 'string') {
        return { valid: false, reason: `${key}.items[${i}].name must be a string` };
      }
      if (typeof item.description !== 'string') {
        return { valid: false, reason: `${key}.items[${i}].description must be a string` };
      }
      if (item.pricing !== undefined && typeof item.pricing !== 'string') {
        return { valid: false, reason: `${key}.items[${i}].pricing must be a string if present` };
      }
      if (item.docs_url !== undefined && typeof item.docs_url !== 'string') {
        return { valid: false, reason: `${key}.items[${i}].docs_url must be a string if present` };
      }
      if (!VALID_RELEVANCE.has(item.relevance as string)) {
        return { valid: false, reason: `${key}.items[${i}].relevance must be "required", "likely", or "optional"` };
      }
    }
  }

  return { valid: true, research: data as TechnicalResearch };
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior technical consultant at OTwoOne, a web consultancy in Ireland. You perform technical due-diligence research on project scopes to help operators understand the stack, services, compliance considerations, and operating costs.

You will receive a merged client context containing all available information about a project. Research the full technical stack required, but only include technologies that are clearly relevant to the analysed scope. Avoid generic "kitchen sink" tool lists.

Respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.

JSON schema:
{
  "summary": "2-3 sentence overall technical research summary",
  "recommendations": ["array of recommended stack choices, e.g. 'Use Vercel for hosting with edge functions'"],
  "assumptions": ["array of assumptions being made, e.g. 'Assuming client has no existing backend infrastructure'"],
  "unknowns": ["array of unresolved unknowns, e.g. 'Unclear whether existing booking system has an API'"],
  "integrations": {
    "summary": "brief overview of integration requirements",
    "items": [
      {
        "name": "Service or API name",
        "description": "what it does and why it is needed",
        "pricing": "real pricing if publicly available, otherwise 'Commercial license required' or 'Quote required'",
        "docs_url": "documentation URL if known",
        "relevance": "required | likely | optional"
      }
    ]
  },
  "infrastructure": {
    "summary": "hosting architecture recommendation with reasoning",
    "items": [{ "name": "...", "description": "...", "pricing": "...", "docs_url": "...", "relevance": "..." }]
  },
  "third_party_services": {
    "summary": "third-party services needed (payments, messaging, email, analytics)",
    "items": [{ "name": "...", "description": "...", "pricing": "...", "docs_url": "...", "relevance": "..." }]
  },
  "compliance": {
    "summary": "compliance considerations (GDPR, data retention, cookie consent, etc.)",
    "items": [{ "name": "...", "description": "...", "relevance": "..." }]
  },
  "operating_cost_estimate": {
    "summary": "estimated monthly operating cost range derived from hosting + services",
    "items": [{ "name": "...", "description": "monthly cost component", "pricing": "€X–€Y/month", "relevance": "..." }]
  }
}

Rules:
- Only include technologies clearly relevant to the project scope
- Classify every item as "required", "likely", or "optional"
- Include real documentation/source URLs where possible
- Never fabricate pricing — if not publicly available, state "Commercial license required" or "Quote required"
- For operating costs, break down by service and provide a total monthly range
- Consider Irish/EU context for compliance (GDPR, cookie consent, data residency)
- Keep recommendations actionable and specific to the project`;

// ── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/hub/leads/[id]/brief/research
 *
 * Hub-protected (middleware). Calls Claude to research the technical stack
 * based on merged client context, then persists results to lead_briefs.
 *
 * Body:
 *   merged_context: string (required)
 *
 * Returns { research: TechnicalResearch, updated_at: string }
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

  let body: { merged_context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const mergedContext = body.merged_context?.trim();
  if (!mergedContext) {
    return NextResponse.json({ error: 'merged_context is required.' }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: mergedContext }],
    });

    const rawText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed: unknown;
    try {
      parsed = extractAndParseJSON(rawText);
    } catch (parseErr) {
      console.error('[research] Failed to parse AI response.');
      console.error('[research] Raw response:', rawText.slice(0, 1000));
      console.error('[research] Parse error:', parseErr instanceof Error ? parseErr.message : parseErr);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 502 },
      );
    }

    // Strict validation
    const validation = validateResearch(parsed);
    if (!validation.valid) {
      console.error('[research] Validation failed:', validation.reason);
      console.error('[research] Raw response:', rawText.slice(0, 1000));
      return NextResponse.json(
        { error: `AI response validation failed: ${validation.reason}. Please try again.` },
        { status: 502 },
      );
    }

    const research = validation.research;
    const now = new Date().toISOString();

    // Persist via true upsert keyed on lead_id
    const { error: dbError } = await supabaseServer
      .from('lead_briefs')
      .upsert(
        {
          lead_id: id,
          technical_research: research,
          technical_research_updated_at: now,
        },
        { onConflict: 'lead_id' },
      );

    if (dbError) {
      console.error('[research] DB upsert error:', dbError.message);
      return NextResponse.json(
        { error: 'Failed to save research results.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ research, updated_at: now });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed.';
    console.error('[research] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
