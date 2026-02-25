import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSharePointItem, mapSubmissionToFields } from "@/lib/sharepoint";

/**
 * POST /api/hub/sp-sync
 *
 * Syncs a single intake submission to the SharePoint Elevate Submissions list.
 * Protected by middleware (hub_session cookie or x-hub-secret header).
 *
 * Body: { id: string }   — the Supabase submission UUID
 *
 * Also callable internally from the elevate submit route by passing
 * x-hub-secret header with the HUB_SECRET value.
 */
export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    // 1) Fetch the submission from Supabase
    const { data: row, error: fetchError } = await supabaseServer
      .from("intake_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json(
        { error: "Submission not found", details: fetchError?.message },
        { status: 404 }
      );
    }

    // 2) Map fields and push to SharePoint
    const fields = mapSubmissionToFields(row);
    const result = await createSharePointItem(fields);

    if (!result.ok) {
      // Persist failure so the hub can show it
      await supabaseServer
        .from("intake_submissions")
        .update({
          sharepoint_sync_error: result.error,
          sharepoint_synced_at: null,
        })
        .eq("id", id);

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // 3) Update Supabase row with SharePoint item ID + sync timestamp
    await supabaseServer
      .from("intake_submissions")
      .update({
        sharepoint_item_id: result.itemId,
        sharepoint_synced_at: new Date().toISOString(),
        sharepoint_sync_error: null,
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      itemId: result.itemId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Unexpected error", details: message },
      { status: 500 }
    );
  }
}
