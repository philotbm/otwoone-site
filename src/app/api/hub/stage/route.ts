import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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

/**
 * PATCH /api/hub/stage
 *
 * Body: { id: string, stage: string }
 * Updates the stage column on intake_submissions.
 * Protected by middleware.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, stage } = body as { id?: string; stage?: string };

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (!stage || !(VALID_STAGES as readonly string[]).includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("intake_submissions")
      .update({ stage: stage as Stage })
      .eq("id", id);

    if (error) {
      console.error("[hub/stage] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, stage });
  } catch (err) {
    console.error("[hub/stage] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
