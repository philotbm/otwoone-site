/**
 * Microsoft Graph API client for SharePoint integration.
 * Server-only — never import into client components.
 *
 * Uses OAuth2 client credentials flow (app-only auth).
 * Token is cached in memory and refreshed automatically before expiry.
 */

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID!;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID!;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET!;
const SITE_ID = process.env.SHAREPOINT_SITE_ID!;
const LIST_ID = process.env.SHAREPOINT_LIST_ID!;

// ─── Token cache ────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph token error ${res.status}: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type SharePointSyncResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string };

export type ElevateSubmissionFields = {
  Title: string;              // Required by SharePoint (maps to submission UUID)
  ContactName?: string;
  ContactEmail?: string;
  Company?: string;
  // CompanyWebsite is a non-writable column type via Graph API — omitted intentionally
  Services?: string;
  PrimaryService?: string;
  Budget?: string;
  Timing?: string;
  QuoteLow?: number;
  QuoteHigh?: number;
  /** Choice column — must be "High" | "Medium" | "Low" (title-cased) */
  Confidence?: string;
  SupportTier?: string;
  Extra?: string;
  SubmittedAt?: string;
};

// ─── SharePoint list item writer ─────────────────────────────────────────────

/**
 * Creates a new item in the Elevate Submissions SharePoint list.
 * Returns the new item's SharePoint ID on success.
 */
export async function createSharePointItem(
  fields: ElevateSubmissionFields
): Promise<SharePointSyncResult> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SITE_ID || !LIST_ID) {
    return { ok: false, error: "SharePoint env vars not configured" };
  }

  try {
    const token = await getGraphToken();

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Graph API ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { ok: true, itemId: String(data.id) };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Field mapper ─────────────────────────────────────────────────────────────

/**
 * Maps a raw Supabase intake_submission row to SharePoint list fields.
 */
export function mapSubmissionToFields(row: {
  id: string;
  contact_name?: string | null;
  contact_email?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  answers?: Record<string, any> | null;
  created_at?: string | null;
}): ElevateSubmissionFields {
  const a = row.answers ?? {};
  const computed = a.computed ?? {};
  const quote = computed.quote ?? {};
  const support = computed.support ?? null;

  const services = Array.isArray(a.services)
    ? a.services.join(", ")
    : a.need_help ?? "";

  // Confidence is a SharePoint Choice column with choices: "High" | "Medium" | "Low"
  // The raw value from Supabase is lowercase ("high", "medium", "low") — must title-case it
  const rawConfidence: string = quote.confidence ?? "";
  const confidence = rawConfidence
    ? rawConfidence.charAt(0).toUpperCase() + rawConfidence.slice(1).toLowerCase()
    : undefined;

  return {
    Title: row.id,
    ContactName: row.contact_name ?? "",
    ContactEmail: row.contact_email ?? "",
    Company: row.company_name ?? "",
    // CompanyWebsite intentionally omitted — Graph API cannot write to this column type
    Services: services,
    PrimaryService: a.primary_service ?? "",
    Budget: a.budget ?? "",
    Timing: a.timing ?? "",
    QuoteLow: typeof quote.low === "number" ? quote.low : undefined,
    QuoteHigh: typeof quote.high === "number" ? quote.high : undefined,
    ...(confidence ? { Confidence: confidence } : {}),
    SupportTier: support?.recommended ?? "project-based",
    Extra: a.extra ?? "",
    SubmittedAt: row.created_at ?? new Date().toISOString(),
  };
}
