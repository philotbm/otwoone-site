import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createInvoiceItem } from "@/lib/sharepoint";

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabaseServer
    .from("intake_submissions")
    .select("*", { count: "exact", head: true })
    .not("project_ref", "is", null); // rough proxy for invoice count — close enough
  const n = (count ?? 0) + 1;
  return `INV-${year}-${String(n).padStart(3, "0")}`;
}

/**
 * POST /api/hub/invoices
 * Creates an invoice entry in the SharePoint Invoices list.
 *
 * Body: {
 *   submissionId: string,
 *   internalRef: string,       // project ref e.g. "OTO-2026-001"
 *   invoiceType: "Deposit" | "Milestone" | "Final",
 *   amount: number,
 *   dueDays?: number,          // days until due (default 30)
 *   notes?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      submissionId,
      internalRef,
      invoiceType,
      amount,
      dueDays = 30,
      notes = "",
    } = body ?? {};

    if (!submissionId || !internalRef || !invoiceType || typeof amount !== "number") {
      return NextResponse.json(
        { error: "submissionId, internalRef, invoiceType, and amount are required" },
        { status: 400 }
      );
    }

    const invoiceNumber = await generateInvoiceNumber();

    const result = await createInvoiceItem({
      Title: invoiceNumber,
      SubmissionID: submissionId,
      InternalRef: internalRef,
      InvoiceType: invoiceType,
      Amount: amount,
      IssuedDate: new Date().toISOString(),
      DueDate: addDays(dueDays),
      Status: "Sent",
      Notes: notes,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, invoiceNumber, itemId: result.itemId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
