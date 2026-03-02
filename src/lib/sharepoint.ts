/**
 * Microsoft Graph API client for SharePoint integration.
 * Server-only — never import into client components.
 *
 * Uses OAuth2 client credentials flow (app-only auth).
 * Token is cached in memory and refreshed automatically before expiry.
 */

const TENANT_ID         = process.env.SHAREPOINT_TENANT_ID!;
const CLIENT_ID         = process.env.SHAREPOINT_CLIENT_ID!;
const CLIENT_SECRET     = process.env.SHAREPOINT_CLIENT_SECRET!;
const SITE_ID           = process.env.SHAREPOINT_SITE_ID!;
const LIST_ID           = process.env.SHAREPOINT_LIST_ID!;
const PROJECTS_LIST_ID  = process.env.SHAREPOINT_PROJECTS_LIST_ID!;
const INVOICES_LIST_ID  = process.env.SHAREPOINT_INVOICES_LIST_ID!;
// Drive ID for the document library where project folders are created
// e.g. process.env.SHAREPOINT_DRIVE_ID or fall back to site default drive
const DRIVE_ID          = process.env.SHAREPOINT_DRIVE_ID ?? '';

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

// ─── Generic Graph item writer / updater ─────────────────────────────────────

async function graphWriteItem(
  listId: string,
  fields: Record<string, unknown>,
  itemId?: string
): Promise<SharePointSyncResult> {
  try {
    const token = await getGraphToken();
    const url = itemId
      ? `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${listId}/items/${itemId}/fields`
      : `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${listId}/items`;

    const res = await fetch(url, {
      method: itemId ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(itemId ? fields : { fields }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Graph API ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { ok: true, itemId: itemId ?? String(data.id) };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectFields = {
  Title: string;               // Internal ref e.g. "OTO-2026-001"
  ProjectName?: string;
  SubmissionID?: string;
  ContactName?: string;
  ContactEmail?: string;
  Company?: string;
  Service?: string;
  Stage?: string;
  AgreedBudget?: number;
  DepositAmount?: number;
  DepositPaid?: string;        // "Yes" | "No"
  DepositPaidDate?: string;
  FinalInvoiceSent?: string;   // "Yes" | "No"
  FinalPaymentReceived?: string;
  StartDate?: string;
  TargetDelivery?: string;
  ProjectLead?: string;
  Notes?: string;
};

export async function createProjectItem(
  fields: ProjectFields
): Promise<SharePointSyncResult> {
  if (!PROJECTS_LIST_ID) return { ok: false, error: "SHAREPOINT_PROJECTS_LIST_ID not configured" };
  return graphWriteItem(PROJECTS_LIST_ID, fields as Record<string, unknown>);
}

export async function updateProjectItem(
  itemId: string,
  fields: Partial<ProjectFields>
): Promise<SharePointSyncResult> {
  if (!PROJECTS_LIST_ID) return { ok: false, error: "SHAREPOINT_PROJECTS_LIST_ID not configured" };
  return graphWriteItem(PROJECTS_LIST_ID, fields as Record<string, unknown>, itemId);
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export type InvoiceFields = {
  Title: string;               // Invoice number e.g. "INV-2026-001"
  SubmissionID?: string;
  InternalRef?: string;        // Project ref e.g. "OTO-2026-001"
  InvoiceType?: string;        // "Deposit" | "Milestone" | "Final"
  Amount?: number;
  IssuedDate?: string;
  DueDate?: string;
  PaidDate?: string;
  Status?: string;             // "Draft" | "Sent" | "Paid" | "Overdue"
  Notes?: string;
};

export async function createInvoiceItem(
  fields: InvoiceFields
): Promise<SharePointSyncResult> {
  if (!INVOICES_LIST_ID) return { ok: false, error: "SHAREPOINT_INVOICES_LIST_ID not configured" };
  return graphWriteItem(INVOICES_LIST_ID, fields as Record<string, unknown>);
}

// ─── Project folder creation ──────────────────────────────────────────────────

export type FolderResult =
  | { ok: true; folderUrl: string }
  | { ok: false; error: string };

/**
 * Creates a project folder in the configured SharePoint document library.
 * Called only on lead conversion (deposit confirmed).
 *
 * Requires SHAREPOINT_DRIVE_ID env var (the document library drive ID).
 * Falls back gracefully if env vars are missing.
 */
export async function createProjectFolder(
  folderName: string
): Promise<FolderResult> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SITE_ID) {
    return { ok: false, error: "SharePoint env vars not configured" };
  }

  if (!DRIVE_ID) {
    return { ok: false, error: "SHAREPOINT_DRIVE_ID not configured" };
  }

  try {
    const token = await getGraphToken();

    const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drives/${DRIVE_ID}/root/children`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Graph API ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { ok: true, folderUrl: data.webUrl ?? "" };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
