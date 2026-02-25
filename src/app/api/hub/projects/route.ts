import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createProjectItem, updateProjectItem } from "@/lib/sharepoint";

// ── Ref generator ──────────────────────────────────────────────────────────────
async function generateProjectRef(): Promise<string> {
  const year = new Date().getFullYear();
  // Count all rows that have a project_ref this year
  const { count } = await supabaseServer
    .from("intake_submissions")
    .select("*", { count: "exact", head: true })
    .not("project_ref", "is", null)
    .like("project_ref", `OTO-${year}-%`);
  const n = (count ?? 0) + 1;
  return `OTO-${year}-${String(n).padStart(3, "0")}`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * POST /api/hub/projects
 * Creates a new project in SharePoint Projects list and links it back to Supabase.
 *
 * Body: {
 *   submissionId: string,
 *   agreedBudget: number,
 *   depositAmount?: number,     // defaults to 50% of agreedBudget
 *   targetDelivery?: string,    // ISO date string
 *   projectLead?: string,       // defaults to "Phil"
 *   notes?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      submissionId,
      agreedBudget,
      depositAmount,
      targetDelivery,
      projectLead = "Phil",
      notes = "",
    } = body ?? {};

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }
    if (typeof agreedBudget !== "number" || agreedBudget <= 0) {
      return NextResponse.json({ error: "agreedBudget must be a positive number" }, { status: 400 });
    }

    // Fetch submission
    const { data: row, error: fetchErr } = await supabaseServer
      .from("intake_submissions")
      .select("id, contact_name, contact_email, company_name, answers, project_ref")
      .eq("id", submissionId)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // If project already exists, return existing ref
    if (row.project_ref) {
      return NextResponse.json({ ok: true, ref: row.project_ref, alreadyExists: true });
    }

    const ref = await generateProjectRef();
    const a = row.answers ?? {};
    const pillars: string[] = Array.isArray(a.pillars) ? a.pillars : [];
    const service = a.primary_pillar ?? pillars[0] ?? a.primary_service ?? a.need_help ?? "";
    const deposit = typeof depositAmount === "number" ? depositAmount : Math.round(agreedBudget * 0.5);

    const projectName = `${row.contact_name ?? row.company_name ?? "Unknown"} — ${service}`;

    const result = await createProjectItem({
      Title: ref,
      ProjectName: projectName,
      SubmissionID: submissionId,
      ContactName: row.contact_name ?? "",
      ContactEmail: row.contact_email ?? "",
      Company: row.company_name ?? "",
      Service: service,
      Stage: "accepted",
      AgreedBudget: agreedBudget,
      DepositAmount: deposit,
      DepositPaid: "No",
      FinalInvoiceSent: "No",
      FinalPaymentReceived: "No",
      StartDate: new Date().toISOString(),
      TargetDelivery: targetDelivery ?? addDays(60),
      ProjectLead: projectLead,
      Notes: notes,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Write back to Supabase
    await supabaseServer
      .from("intake_submissions")
      .update({
        project_sp_item_id: result.itemId,
        project_ref: ref,
        agreed_budget: agreedBudget,
      })
      .eq("id", submissionId);

    return NextResponse.json({ ok: true, ref, itemId: result.itemId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/hub/projects
 * Updates an existing project in SharePoint.
 *
 * Body: { itemId: string, fields: Partial<ProjectFields> }
 */
export async function PATCH(req: Request) {
  try {
    const { itemId, fields } = await req.json();

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const result = await updateProjectItem(itemId, fields ?? {});
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
