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

/**
 * Extract and parse JSON from a Claude response that may include
 * explanatory text, markdown fences, or leading/trailing commentary.
 *
 * Extraction priority:
 *   1. ```json fenced block (greedy — outermost fence pair)
 *   2. Generic ``` fenced block
 *   3. First '{' to last '}' substring
 *   4. Full response text as-is
 *
 * Only after extraction does JSON.parse run.
 */
function extractAndParseJSON(raw: string): TechnicalResearch {
  const text = raw.trim();
  let candidate: string | null = null;

  // 1. ```json fenced block (greedy match to outermost closing fence)
  const jsonFenceMatch = text.match(/```json\s*\n([\s\S]*)\n\s*```/);
  if (jsonFenceMatch) {
    candidate = jsonFenceMatch[1].trim();
  }

  // 2. Generic ``` fenced block
  if (!candidate) {
    const genericFenceMatch = text.match(/```\s*\n([\s\S]*)\n\s*```/);
    if (genericFenceMatch) {
      candidate = genericFenceMatch[1].trim();
    }
  }

  // 3. First '{' to last '}' substring
  if (!candidate) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      candidate = text.slice(firstBrace, lastBrace + 1);
    }
  }

  // 4. Full response text as-is
  if (!candidate) {
    candidate = text;
  }

  try {
    return JSON.parse(candidate) as TechnicalResearch;
  } catch (parseErr) {
    // Log both raw and extracted candidate for debugging
    console.error('[research] JSON.parse failed on extracted candidate.');
    console.error('[research] Parse error:', parseErr instanceof Error ? parseErr.message : parseErr);
    console.error('[research] Candidate payload (first 1000 chars):', candidate.slice(0, 1000));
    if (candidate !== text) {
      console.error('[research] Full raw response (first 1000 chars):', text.slice(0, 1000));
    }
    throw new Error('Failed to parse JSON from AI response');
  }
}

// ── Schema normalisation (coerce minor LLM variations before validation) ─────

const CATEGORY_KEYS: (keyof Pick<TechnicalResearch, 'integrations' | 'infrastructure' | 'third_party_services' | 'compliance' | 'operating_cost_estimate'>)[] = [
  'integrations', 'infrastructure', 'third_party_services', 'compliance', 'operating_cost_estimate',
];

const DEFAULT_CATEGORY = { summary: '', items: [] };

function normaliseResearch(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return data as Record<string, unknown>;
  const d = { ...(data as Record<string, unknown>) };

  // Coerce top-level string arrays: if Claude returns a single string, wrap it
  for (const key of ['recommendations', 'assumptions', 'unknowns'] as const) {
    if (typeof d[key] === 'string') {
      d[key] = [(d[key] as string)];
    }
  }

  // Ensure all 5 category objects exist
  for (const key of CATEGORY_KEYS) {
    if (!d[key] || typeof d[key] !== 'object') {
      d[key] = { ...DEFAULT_CATEGORY };
      continue;
    }
    const cat = { ...(d[key] as Record<string, unknown>) };
    // Ensure items is an array; if single object, wrap
    if (cat.items && !Array.isArray(cat.items) && typeof cat.items === 'object') {
      cat.items = [cat.items];
    }
    if (!Array.isArray(cat.items)) {
      cat.items = [];
    }
    d[key] = cat;
  }

  return d;
}

// ── Strict runtime validation ────────────────────────────────────────────────

const VALID_RELEVANCE = new Set(['required', 'likely', 'optional']);

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

// ── Structured error helper ─────────────────────────────────────────────────

type FailStage = 'config' | 'input' | 'weak_scope' | 'ai_call' | 'extraction' | 'normalisation' | 'validation' | 'persistence';

function failResponse(stage: FailStage, message: string, status: number) {
  const composed = `Research failed at ${stage}: ${message}`;
  console.error(`[research:${stage}] ${message}`);
  return NextResponse.json({ error: composed, stage, message }, { status });
}

// ── Weak-scope detection ────────────────────────────────────────────────────

const WEAK_SCOPE_THRESHOLD = 120; // characters — anything shorter *may* be too vague

const TECHNICAL_KEYWORDS: readonly string[] = [
  // Integrations
  'api', 'integration', 'webhook', 'stripe', 'revolut', 'oauth', 'zapier',
  // System
  'dashboard', 'portal', 'admin', 'workflow', 'booking', 'automation', 'crm', 'analytics',
  // Infrastructure
  'hosting', 'server', 'database', 'migration', 'authentication',
];

const TECHNICAL_KEYWORDS_RE = new RegExp(
  `\\b(?:${TECHNICAL_KEYWORDS.join('|')})\\b`,
  'i',
);

function isWeakScope(context: string): boolean {
  const stripped = context.replace(/\s+/g, ' ').trim();

  // If any technical keyword is present the scope is meaningful — always run research
  if (TECHNICAL_KEYWORDS_RE.test(stripped)) return false;

  // No keywords: fall back to length check
  if (stripped.length < WEAK_SCOPE_THRESHOLD) return true;

  // Also catch heading-only content with no real substance
  const withoutHeadings = stripped.replace(/#{1,4}\s+[^\n]+/g, '').trim();
  if (withoutHeadings.length < WEAK_SCOPE_THRESHOLD) return true;

  return false;
}

function emptyResearch(): TechnicalResearch {
  const empty = { summary: '', items: [] };
  return {
    summary: 'Insufficient project scope to perform meaningful technical research. Add more client context and try again.',
    recommendations: [],
    assumptions: [],
    unknowns: ['Project scope is too vague to identify specific technical requirements.'],
    integrations: { ...empty },
    infrastructure: { ...empty },
    third_party_services: { ...empty },
    compliance: { ...empty },
    operating_cost_estimate: { ...empty },
  };
}

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
 * On failure returns { error: string, stage: FailStage, message: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return failResponse('config', 'ANTHROPIC_API_KEY is not configured.', 500);
  }

  let body: { merged_context?: string };
  try {
    body = await req.json();
  } catch {
    return failResponse('input', 'Invalid request body.', 400);
  }

  const mergedContext = body.merged_context?.trim();
  if (!mergedContext) {
    return failResponse('input', 'merged_context is required.', 400);
  }

  // ── Weak-scope fallback: return safe empty research instead of wasting an AI call
  if (isWeakScope(mergedContext)) {
    const research = emptyResearch();
    const now = new Date().toISOString();

    const { error: dbError } = await supabaseServer
      .from('lead_briefs')
      .upsert(
        { lead_id: id, technical_research: research, technical_research_updated_at: now },
        { onConflict: 'lead_id' },
      );

    if (dbError) {
      return failResponse('persistence', dbError.message, 500);
    }

    return NextResponse.json({ research, updated_at: now, weak_scope: true });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    let rawText: string;
    try {
      const aiMessage = await anthropic.messages.create({
        model: RESEARCH_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: mergedContext }],
      });

      rawText = aiMessage.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
    } catch (aiErr) {
      const detail = aiErr instanceof Error ? aiErr.message : 'Unknown AI error';
      return failResponse('ai_call', detail, 502);
    }

    // Step 1: Extract JSON from response
    let parsed: unknown;
    try {
      parsed = extractAndParseJSON(rawText);
    } catch (parseErr) {
      const detail = parseErr instanceof Error ? parseErr.message : 'JSON extraction failed';
      console.error(`[research:extraction] Raw response (first 1000 chars): ${rawText.slice(0, 1000)}`);
      return failResponse('extraction', detail, 502);
    }

    // Step 2: Normalise minor LLM shape variations
    let normalised: Record<string, unknown>;
    try {
      normalised = normaliseResearch(parsed);
    } catch (normErr) {
      const detail = normErr instanceof Error ? normErr.message : 'Normalisation failed';
      console.error(`[research:normalisation] Parsed payload (first 1000 chars): ${JSON.stringify(parsed).slice(0, 1000)}`);
      return failResponse('normalisation', detail, 502);
    }

    // Step 3: Strict validation
    const validation = validateResearch(normalised);
    if (!validation.valid) {
      console.error(`[research:validation] Normalised payload (first 1000 chars): ${JSON.stringify(normalised).slice(0, 1000)}`);
      return failResponse('validation', validation.reason, 502);
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
      return failResponse('persistence', dbError.message, 500);
    }

    return NextResponse.json({ research, updated_at: now });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unexpected error';
    return failResponse('ai_call', detail, 502);
  }
}
