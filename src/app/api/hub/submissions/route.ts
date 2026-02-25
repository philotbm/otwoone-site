import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * GET /api/hub/submissions
 *
 * Returns paginated intake submissions for the hub UI.
 * Protected by middleware.
 *
 * Query params:
 *   limit  — default 50
 *   offset — default 0
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const { data, error, count } = await supabaseServer
      .from("intake_submissions")
      .select(
        "id, created_at, status, source, stage, contact_name, contact_email, company_name, answers, sharepoint_item_id, sharepoint_synced_at, sharepoint_sync_error, project_sp_item_id, project_ref, agreed_budget",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch submissions", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, count, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Unexpected error", details: message },
      { status: 500 }
    );
  }
}
