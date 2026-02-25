/**
 * POST /api/hub/setup-columns
 *
 * One-time utility to create the custom columns on the SharePoint
 * "Elevate Submissions" list.  Safe to run multiple times — existing
 * columns return 409 and are counted as "skipped".
 *
 * Protected by proxy (hub_session cookie required).
 */
import { NextResponse } from "next/server";

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;
const SITE_ID = process.env.SHAREPOINT_SITE_ID;
const LIST_ID = process.env.SHAREPOINT_LIST_ID;

async function getToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Token fetch failed: " + JSON.stringify(data));
  return data.access_token;
}

const COLUMNS = [
  { name: "ContactName",    definition: { text: {} } },
  { name: "ContactEmail",   definition: { text: {} } },
  { name: "Company",        definition: { text: {} } },
  { name: "CompanyWebsite", definition: { text: {} } },
  { name: "Services",       definition: { text: { allowMultipleLines: true } } },
  { name: "PrimaryService", definition: { text: {} } },
  { name: "Budget",         definition: { text: {} } },
  { name: "Timing",         definition: { text: {} } },
  { name: "QuoteLow",       definition: { number: {} } },
  { name: "QuoteHigh",      definition: { number: {} } },
  { name: "Confidence",     definition: { text: {} } },
  { name: "SupportTier",    definition: { text: {} } },
  { name: "Extra",          definition: { text: { allowMultipleLines: true } } },
  { name: "SubmittedAt",    definition: { text: {} } },
];

export async function POST() {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SITE_ID || !LIST_ID) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const token = await getToken();
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/columns`;

  const results: { name: string; status: number; body: unknown }[] = [];

  for (const col of COLUMNS) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: col.name, ...col.definition }),
    });
    const body = await res.json();
    results.push({ name: col.name, status: res.status, body });
  }

  const created = results.filter((r) => r.status === 201).map((r) => r.name);
  const skipped = results.filter((r) => r.status === 409).map((r) => r.name);
  const failed  = results.filter((r) => r.status !== 201 && r.status !== 409);

  return NextResponse.json({ created, skipped, failed });
}
