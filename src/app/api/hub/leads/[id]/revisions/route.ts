import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

// ── Revision batch types ─────────────────────────────────────────────────────

type RevisionItem = {
  description: string;
  type: 'content' | 'design' | 'functionality' | 'integration' | 'other';
};

type RevisionBatch = {
  title: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  status: 'pending' | 'ready' | 'in_progress' | 'complete';
  operator_note: string;
  objective: string;
  implementation_notes: string;
  open_questions: string[];
  acceptance_criteria: string[];
  items: RevisionItem[];
};

type StructuredOutput = {
  batches: RevisionBatch[];
};

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior project manager at StudioFlow, a web consultancy. Your role is to convert raw client feedback into structured, execution-ready revision batches.

You will receive client feedback text — this may be from an email, a call summary, meeting notes, or a pasted message. Your job is to:

1. Extract every distinct revision request
2. Group them into logical batches (by theme, page, or concern — NOT one batch per item)
3. Assign a priority to each batch (high = blocking or critical, medium = important, low = nice-to-have)
4. Classify each item by type
5. Write an execution brief for each batch

RULES:
- Be specific and actionable — each item should be clear enough for a developer to act on
- Do NOT hallucinate features or scope that isn't in the feedback
- Do NOT add generic filler items ("review overall UX", "ensure accessibility")
- Do NOT repeat the same revision in multiple batches
- Keep descriptions concise — one sentence per item
- If feedback is vague, preserve the vagueness rather than inventing specifics
- Group intelligently: a batch should have 2–6 items where possible
- Prefer fewer, well-grouped batches over many single-item batches

EXECUTION BRIEF RULES:
- objective: one sentence explaining the intended outcome in plain English
- implementation_notes: practical, concise notes an operator or developer would find useful — avoid generic advice
- open_questions: only include real uncertainties that genuinely need answering before work starts — leave empty if none
- acceptance_criteria: simple, observable checks that confirm the batch is done — 2–4 items max
- Do NOT invent technical specifics that aren't implied by the feedback
- Keep everything commercially and operationally useful

Respond with valid JSON only. No markdown, no code fences, no explanation.

JSON schema:
{
  "batches": [
    {
      "title": "short descriptive batch title",
      "priority": "high | medium | low",
      "objective": "one-sentence intended outcome",
      "implementation_notes": "practical notes for the implementer",
      "open_questions": ["genuine uncertainty that needs answering"],
      "acceptance_criteria": ["observable check that confirms completion"],
      "items": [
        {
          "description": "clear, actionable revision description",
          "type": "content | design | functionality | integration | other"
        }
      ]
    }
  ]
}

Type definitions:
- content: text, copy, images, information changes
- design: visual, layout, styling, branding changes
- functionality: features, interactions, logic changes
- integration: API, third-party service, data flow changes
- other: anything that doesn't fit the above`;

// ── JSON extraction ──────────────────────────────────────────────────────────

function extractJSON(raw: string): StructuredOutput {
  let text = raw.trim();

  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Try direct parse
  try {
    return JSON.parse(text) as StructuredOutput;
  } catch {
    // Fall through
  }

  // Extract first JSON object via brace matching
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    if (depth === 0) { end = i; break; }
  }
  if (end === -1) throw new Error('Unterminated JSON object');

  return JSON.parse(text.slice(start, end + 1)) as StructuredOutput;
}

// ── Validation ───────────────────────────────────────────────────────────────

const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);
const VALID_TYPES = new Set(['content', 'design', 'functionality', 'integration', 'other']);

function validateOutput(data: StructuredOutput): string | null {
  if (!data.batches || !Array.isArray(data.batches)) return 'Missing batches array';
  if (data.batches.length === 0) return 'No batches generated';

  for (let i = 0; i < data.batches.length; i++) {
    const batch = data.batches[i];
    if (!batch.title || typeof batch.title !== 'string') return `Batch ${i}: missing title`;
    if (!VALID_PRIORITIES.has(batch.priority)) return `Batch ${i}: invalid priority "${batch.priority}"`;
    if (!batch.items || !Array.isArray(batch.items) || batch.items.length === 0) return `Batch ${i}: missing items`;

    for (let j = 0; j < batch.items.length; j++) {
      const item = batch.items[j];
      if (!item.description || typeof item.description !== 'string') return `Batch ${i}, item ${j}: missing description`;
      if (!VALID_TYPES.has(item.type)) return `Batch ${i}, item ${j}: invalid type "${item.type}"`;
    }
  }

  return null;
}

/**
 * Inject default triage + execution brief metadata onto each batch after AI generation.
 * AI produces title, priority, items, objective, implementation_notes, open_questions, acceptance_criteria.
 * We ensure triage defaults (effort, status, operator_note) and execution brief defaults are present.
 */
function injectDefaults(structured: StructuredOutput): StructuredOutput {
  return {
    batches: structured.batches.map((batch) => ({
      ...batch,
      effort: batch.effort ?? 'medium',
      status: batch.status ?? 'pending',
      operator_note: batch.operator_note ?? '',
      objective: batch.objective ?? '',
      implementation_notes: batch.implementation_notes ?? '',
      open_questions: Array.isArray(batch.open_questions) ? batch.open_questions : [],
      acceptance_criteria: Array.isArray(batch.acceptance_criteria) ? batch.acceptance_criteria : [],
    })),
  };
}

// ── GET: retrieve revisions for a lead ───────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('lead_revisions')
    .select('id, lead_id, raw_feedback, structured_output, created_at, updated_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revisions: data ?? [] });
}

// ── POST: generate structured revision plan from raw feedback ────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  let body: { raw_feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawFeedback = body.raw_feedback?.trim();
  if (!rawFeedback || rawFeedback.length < 10) {
    return NextResponse.json({ error: 'raw_feedback is required (minimum 10 characters).' }, { status: 400 });
  }

  // Verify lead exists
  const { data: lead, error: leadErr } = await supabaseServer
    .from('leads')
    .select('id')
    .eq('id', id)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  // Call AI
  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawFeedback }],
    });

    const rawText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let structured: StructuredOutput;
    try {
      structured = extractJSON(rawText);
    } catch {
      console.error('[revisions] Failed to parse AI response:', rawText.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 502 },
      );
    }

    const validationError = validateOutput(structured);
    if (validationError) {
      console.error('[revisions] Validation failed:', validationError);
      return NextResponse.json(
        { error: `AI output validation failed: ${validationError}. Please try again.` },
        { status: 502 },
      );
    }

    // Inject default triage + execution brief metadata
    structured = injectDefaults(structured);

    // Persist
    const { data: revision, error: insertErr } = await supabaseServer
      .from('lead_revisions')
      .insert({
        lead_id: id,
        raw_feedback: rawFeedback,
        structured_output: structured,
      })
      .select('id, lead_id, raw_feedback, structured_output, created_at, updated_at')
      .single();

    if (insertErr) {
      console.error('[revisions] DB insert failed:', insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ revision });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI request failed.';
    console.error('[revisions] AI error:', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
