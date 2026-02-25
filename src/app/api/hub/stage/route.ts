import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { updateProjectItem, createInvoiceItem } from "@/lib/sharepoint";

const VALID_STAGES = [
  "submitted",
  "quoted",
  "scoping_call",
  "accepted",
  "deposit_paid",
  "in_build",
  "delivered",
] as const;

type Stage = (typeof VALID_STAGES)[number];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * PATCH /api/hub/stage
 *
 * Body: {
 *   id: string,
 *   stage: Stage,
 *   // Optional — only used when stage === "accepted"
 *   agreedBudget?: number,
 *   depositAmount?: number,
 *   targetDelivery?: string,
 *   projectLead?: string,
 * }
 *
 * Updates stage in Supabase, then triggers SharePoint project/invoice
 * automation for key stage transitions.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      stage,
      agreedBudget,
      depositAmount,
      targetDelivery,
      projectLead,
    } = body as {
      id?: string;
      stage?: string;
      agreedBudget?: number;
      depositAmount?: number;
      targetDelivery?: string;
      projectLead?: string;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (!stage || !(VALID_STAGES as readonly string[]).includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    // 1) Update Supabase stage
    const { error: stageErr } = await supabaseServer
      .from("intake_submissions")
      .update({ stage: stage as Stage })
      .eq("id", id);

    if (stageErr) {
      console.error("[hub/stage] Supabase error:", stageErr);
      return NextResponse.json({ error: stageErr.message }, { status: 500 });
    }

    // 2) Fetch full row for SP hooks
    const { data: row } = await supabaseServer
      .from("intake_submissions")
      .select("id, contact_name, contact_email, company_name, answers, project_sp_item_id, project_ref, agreed_budget")
      .eq("id", id)
      .single();

    // 3) Stage-specific SharePoint hooks (non-blocking — errors logged but don't fail the response)
    const hooks: Promise<unknown>[] = [];

    if (stage === "accepted" && agreedBudget && agreedBudget > 0) {
      // Create the project via the projects API endpoint (handles ref generation + Supabase writeback)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.otwoone.ie";
      const secret = process.env.HUB_SECRET ?? "";
      hooks.push(
        fetch(`${baseUrl}/api/hub/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-hub-secret": secret },
          body: JSON.stringify({
            submissionId: id,
            agreedBudget,
            depositAmount,
            targetDelivery,
            projectLead: projectLead ?? "Phil",
          }),
        }).then(r => r.json()).then(j => {
          if (!j.ok) console.error("[hub/stage] Project creation failed:", j.error);
        }).catch(e => console.error("[hub/stage] Project hook error:", e))
      );
    }

    if (stage === "deposit_paid" && row?.project_sp_item_id) {
      // Update Projects list + create Deposit invoice
      hooks.push(
        updateProjectItem(row.project_sp_item_id, {
          DepositPaid: "Yes",
          DepositPaidDate: new Date().toISOString(),
          Stage: "deposit_paid",
        }).catch(e => console.error("[hub/stage] updateProject deposit_paid:", e))
      );

      if (row.project_ref) {
        const budget = Number(row.agreed_budget ?? agreedBudget ?? 0);
        const deposit = budget > 0 ? Math.round(budget * 0.5) : 0;
        hooks.push(
          createInvoiceItem({
            Title: `INV-DEP-${row.project_ref}`,
            SubmissionID: id,
            InternalRef: row.project_ref,
            InvoiceType: "Deposit",
            Amount: deposit > 0 ? deposit : undefined,
            IssuedDate: new Date().toISOString(),
            DueDate: addDays(14),
            Status: "Sent",
          }).catch(e => console.error("[hub/stage] createInvoice deposit:", e))
        );
      }
    }

    if (stage === "in_build" && row?.project_sp_item_id) {
      hooks.push(
        updateProjectItem(row.project_sp_item_id, { Stage: "in_build" })
          .catch(e => console.error("[hub/stage] updateProject in_build:", e))
      );
    }

    if (stage === "delivered" && row?.project_sp_item_id) {
      hooks.push(
        updateProjectItem(row.project_sp_item_id, {
          Stage: "delivered",
          FinalInvoiceSent: "Yes",
        }).catch(e => console.error("[hub/stage] updateProject delivered:", e))
      );

      if (row.project_ref) {
        const budget = Number(row.agreed_budget ?? 0);
        const final = budget > 0 ? Math.round(budget * 0.5) : 0;
        hooks.push(
          createInvoiceItem({
            Title: `INV-FIN-${row.project_ref}`,
            SubmissionID: id,
            InternalRef: row.project_ref,
            InvoiceType: "Final",
            Amount: final > 0 ? final : undefined,
            IssuedDate: new Date().toISOString(),
            DueDate: addDays(30),
            Status: "Sent",
          }).catch(e => console.error("[hub/stage] createInvoice final:", e))
        );
      }
    }

    // Wait for all hooks (they catch internally, won't throw)
    await Promise.all(hooks);

    return NextResponse.json({ ok: true, stage });
  } catch (err) {
    console.error("[hub/stage] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
