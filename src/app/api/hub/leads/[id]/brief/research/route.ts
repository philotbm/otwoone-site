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

// ── Forced tool-call schema (guarantees structured JSON output) ──────────────

const RESEARCH_TOOL_NAME = 'technical_research';

// Shared item schema for category items
const ITEM_SCHEMA_WITH_PRICING = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, description: 'Name of the service, tool, or component' },
    description: { type: 'string' as const, description: 'What it does and why it is needed for this project' },
    pricing: { type: 'string' as const, description: 'Real public pricing if available, otherwise "Commercial license required" or "Quote required". Never fabricate.' },
    docs_url: { type: 'string' as const, description: 'Official documentation or pricing page URL' },
    relevance: { type: 'string' as const, enum: ['required', 'likely', 'optional'], description: 'How critical this item is to the project' },
  },
  required: ['name', 'description', 'relevance'] as const,
};

const ITEM_SCHEMA_NO_PRICING = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, description: 'Name of the compliance consideration' },
    description: { type: 'string' as const, description: 'What it covers and why it matters' },
    relevance: { type: 'string' as const, enum: ['required', 'likely', 'optional'] },
  },
  required: ['name', 'description', 'relevance'] as const,
};

function categorySchema(desc: string, itemSchema: typeof ITEM_SCHEMA_WITH_PRICING | typeof ITEM_SCHEMA_NO_PRICING) {
  return {
    type: 'object' as const,
    description: desc,
    properties: {
      summary: { type: 'string' as const, description: 'Brief overview for this category' },
      items: {
        type: 'array' as const,
        description: 'Concrete researched items. Populate with 2-5 items when this category is relevant to the project scope. Only leave empty if genuinely not applicable.',
        items: itemSchema,
      },
    },
    required: ['summary', 'items'] as const,
  };
}

const RESEARCH_TOOL: Anthropic.Tool = {
  name: RESEARCH_TOOL_NAME,
  description: `Submit complete technical research results. CRITICAL: all researched items MUST go inside their respective category objects (integrations, infrastructure, third_party_services, compliance, operating_cost_estimate). Do NOT put items at the top level. Each relevant category should contain 2-5 concrete items with real service names, descriptions, pricing, and documentation links.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: '2-3 sentence overall technical research summary' },
      recommendations: { type: 'array', items: { type: 'string' }, description: 'Specific recommended stack choices (e.g. "Use Vercel for hosting with edge functions")' },
      assumptions: { type: 'array', items: { type: 'string' }, description: 'Assumptions being made about the project' },
      unknowns: { type: 'array', items: { type: 'string' }, description: 'Unresolved questions that need client clarification' },
      integrations: categorySchema(
        'External APIs and data providers the project needs to integrate with. Include specific provider names, not generic descriptions. Examples: FlightAware API, Revolut Business API, Google Maps Platform.',
        ITEM_SCHEMA_WITH_PRICING,
      ),
      infrastructure: categorySchema(
        'Hosting architecture, application framework, database, CDN, and deployment platform. Include specific plan/tier recommendations with pricing. Examples: Vercel Pro, Supabase Pro, Cloudflare.',
        ITEM_SCHEMA_WITH_PRICING,
      ),
      third_party_services: categorySchema(
        'Third-party SaaS for payments, email, SMS, analytics, monitoring, auth, storage, notifications. Include specific providers with pricing tiers. Examples: Stripe, Resend, PostHog, Clerk.',
        ITEM_SCHEMA_WITH_PRICING,
      ),
      compliance: categorySchema(
        'GDPR, cookie consent, data retention, privacy, sensitive data, and regulatory considerations relevant to an Irish/EU context.',
        ITEM_SCHEMA_NO_PRICING,
      ),
      operating_cost_estimate: categorySchema(
        'Monthly recurring cost breakdown derived from infrastructure + third-party services + API usage. Each item should have a €X-€Y/month pricing estimate. Include a total range in the summary.',
        ITEM_SCHEMA_WITH_PRICING,
      ),
    },
    required: ['summary', 'recommendations', 'assumptions', 'unknowns', 'integrations', 'infrastructure', 'third_party_services', 'compliance', 'operating_cost_estimate'],
  },
};

// ── Schema normalisation (coerce minor LLM variations before validation) ─────

const CATEGORY_KEYS: (keyof Pick<TechnicalResearch, 'integrations' | 'infrastructure' | 'third_party_services' | 'compliance' | 'operating_cost_estimate'>)[] = [
  'integrations', 'infrastructure', 'third_party_services', 'compliance', 'operating_cost_estimate',
];

const DEFAULT_CATEGORY = { summary: '', items: [] };

// Keywords for redistributing misplaced root-level items into categories
// Keywords for redistributing misplaced root-level items into categories.
// Order matters: third-party checked before infra so "Twilio or AWS SNS" → third_party, not infra.
const COMPLIANCE_KEYWORDS = /\b(gdpr|cookie|consent|retention|privacy|dpo|data.?protection|regulation|compliance)\b/i;
const THIRD_PARTY_KEYWORDS = /\b(stripe|twilio|resend|sendgrid|postmark|sentry|posthog|plausible|clerk|auth0|analytics|monitoring|email.?service|sms|notification|payment)/i;
const INFRA_KEYWORDS = /\b(vercel|netlify|aws|azure|gcp|cloudflare|supabase|firebase|heroku|docker|kubernetes|hosting|cdn|database|postgres|mysql|redis|mongodb)\b/i;

function classifyItem(item: Record<string, unknown>): keyof Pick<TechnicalResearch, 'integrations' | 'infrastructure' | 'third_party_services' | 'compliance' | 'operating_cost_estimate'> {
  const text = `${item.name ?? ''} ${item.description ?? ''}`.toLowerCase();
  if (COMPLIANCE_KEYWORDS.test(text)) return 'compliance';
  if (THIRD_PARTY_KEYWORDS.test(text)) return 'third_party_services';
  if (INFRA_KEYWORDS.test(text)) return 'infrastructure';
  return 'integrations'; // default bucket for APIs and external data providers
}

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

  // ── Redistribute root-level "items" array into categories ─────────────
  // The model sometimes puts all items at the top level instead of inside categories.
  // Detect this and redistribute into the correct category objects.
  if (Array.isArray(d.items) && d.items.length > 0) {
    console.warn(`[research:normalisation] Found ${d.items.length} root-level items — redistributing into categories.`);
    for (const rawItem of d.items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Record<string, unknown>;
      const targetKey = classifyItem(item);
      const cat = d[targetKey] as Record<string, unknown>;
      (cat.items as unknown[]).push(item);
    }
    delete d.items;
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

You will receive a merged client context containing all available information about a project.

CRITICAL INSTRUCTIONS:
1. All researched items MUST be placed inside their respective category objects. Do NOT create a top-level "items" array.
2. Each of the 5 categories (integrations, infrastructure, third_party_services, compliance, operating_cost_estimate) must contain concrete items when relevant to the project.
3. For a typical technical project, aim for 2-5 items per relevant category.
4. Empty categories should ONLY be used when genuinely not applicable to the project scope.

Category guidance:
- integrations: External APIs, data providers, POS/payment gateways, CRM connectors. Name specific providers (e.g. "FlightAware API", "Revolut Business API"), not generic descriptions.
- infrastructure: Hosting platform, app framework, database, CDN. Include specific tiers/plans (e.g. "Vercel Pro", "Supabase Pro", "Cloudflare Free").
- third_party_services: Email (Resend, SendGrid), SMS (Twilio), analytics (PostHog, Plausible), auth (Clerk, Auth0), monitoring (Sentry), storage (Cloudflare R2, S3).
- compliance: GDPR, cookie consent, data retention, sensitive data handling — always relevant for Irish/EU projects.
- operating_cost_estimate: Monthly cost breakdown derived from the items in infrastructure + third_party_services + integrations. Each item must have a €X–€Y/month estimate. Include a total monthly range in the summary.

Rules:
- Only include technologies clearly relevant to the project scope — avoid generic "kitchen sink" lists
- Classify every item as "required", "likely", or "optional"
- Include real documentation/pricing page URLs in docs_url where possible
- Never fabricate pricing — if not publicly available, state "Commercial license required" or "Quote required"
- Consider Irish/EU context for compliance (GDPR, cookie consent, data residency)
- Keep recommendations actionable and specific to the project
- If you cannot determine a field, return an empty value that respects the schema

IMPORTANT — Iteration log and new information:
- The merged context may contain an "## Iteration log" section and/or a "## New information" section
- These contain confirmed information from calls, emails, meetings, or operator notes added AFTER the initial enquiry
- Treat iteration log entries as CONFIRMED FACTS that resolve open questions
- If an iteration entry confirms a technology choice, POS provider, migration approach, sync method, or similar — reflect that as a confirmed requirement, not an unknown
- The "unknowns" array must ONLY contain questions that remain genuinely unresolved after accounting for ALL iteration entries and new information
- Do NOT repeat questions as unknowns if the iteration log or new information section already answers them`;

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

    // ── Call Claude with forced tool use for guaranteed structured JSON ──
    let parsed: unknown;
    try {
      const aiMessage = await anthropic.messages.create({
        model: RESEARCH_MODEL,
        max_tokens: 4096,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: mergedContext }],
        tools: [RESEARCH_TOOL],
        tool_choice: { type: 'tool', name: RESEARCH_TOOL_NAME },
      });

      const toolBlock = aiMessage.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (!toolBlock) {
        console.error('[research:ai_call] No tool_use block in response. Stop reason:', aiMessage.stop_reason);
        return failResponse('ai_call', 'Model did not return structured JSON.', 502);
      }

      parsed = toolBlock.input;
    } catch (aiErr) {
      const detail = aiErr instanceof Error ? aiErr.message : 'Unknown AI error';
      return failResponse('ai_call', detail, 502);
    }

    // Step 1: Normalise minor LLM shape variations (extraction no longer needed)
    let normalised: Record<string, unknown>;
    try {
      normalised = normaliseResearch(parsed);
    } catch (normErr) {
      const detail = normErr instanceof Error ? normErr.message : 'Normalisation failed';
      console.error(`[research:normalisation] Parsed payload (first 1000 chars): ${JSON.stringify(parsed).slice(0, 1000)}`);
      return failResponse('normalisation', detail, 502);
    }

    // Step 2: Strict validation
    const validation = validateResearch(normalised);
    if (!validation.valid) {
      console.error(`[research:validation] Normalised payload (first 1000 chars): ${JSON.stringify(normalised).slice(0, 1000)}`);
      return failResponse('validation', validation.reason, 502);
    }

    const research = validation.research;

    // ── v1.95.3: Deterministic unknown-stripping ─────────────────────────
    // AI may regenerate the same unknowns even when iteration content answers them.
    // Programmatically remove unknowns that match answered topics in iteration content.
    if (research.unknowns && research.unknowns.length > 0) {
      const iterMatch = mergedContext.match(/## Iteration log[\s\S]*?(?=\n##|$)/i)?.[0] ?? '';
      const newInfoMatch = mergedContext.match(/## New information[\s\S]*?(?=\n##|$)/i)?.[0] ?? '';
      const answeredText = (iterMatch + ' ' + newInfoMatch).toLowerCase();

      if (answeredText.length > 20) {
        const ANSWER_SIGNALS: Array<{ topic: RegExp; keywords: string[] }> = [
          { topic: /pos|point.of.sale|till|square|clover|toast/i, keywords: ['square', 'clover', 'toast', 'pos confirmed', 'till system', 'epos'] },
          { topic: /brs|tee.?sheet|booking.*api/i, keywords: ['brs', 'rest api', 'nightly batch', 'api confirmed', 'api available'] },
          { topic: /migrat|clubnet|legacy|existing.*system|data.*(?:transfer|export)/i, keywords: ['migration', 'csv export', 'csv import', 'clubnet', 'member data', 'data transfer'] },
          { topic: /golf.?ireland|handicap/i, keywords: ['golf ireland', 'handicap api', 'handicap data'] },
          { topic: /rollout|phased|deployment.*(?:plan|approach)/i, keywords: ['phased', 'phase 1', 'rollout', 'phased approach'] },
          { topic: /transaction.*volume|throughput/i, keywords: ['transactions/week', 'tx/week', 'per week', 'volume'] },
        ];

        research.unknowns = research.unknowns.filter(unknown => {
          const uLower = unknown.toLowerCase();
          for (const { topic, keywords } of ANSWER_SIGNALS) {
            if (topic.test(uLower) && keywords.some(kw => answeredText.includes(kw))) {
              return false; // answered — remove
            }
          }
          return true; // keep
        });
      }
    }

    // ── v1.98.0: Deduplicate research items across categories ──────────
    // AI often repeats the same provider/tool in multiple categories.
    // Keep the first occurrence, remove duplicates by normalised name.
    const seenItems = new Set<string>();
    const categories: Array<keyof TechnicalResearch> = ['integrations', 'infrastructure', 'third_party_services', 'compliance', 'operating_cost_estimate'];
    for (const catKey of categories) {
      const cat = research[catKey] as ResearchCategory | undefined;
      if (!cat?.items) continue;
      const beforeCount = cat.items.length;
      cat.items = cat.items.filter(item => {
        const norm = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenItems.has(norm)) return false;
        seenItems.add(norm);
        return true;
      });
      if (cat.items.length < beforeCount) {
        console.log(`[research] Deduped ${catKey}: ${beforeCount} → ${cat.items.length} items`);
      }
    }

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
