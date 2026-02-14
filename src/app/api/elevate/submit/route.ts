import { Resend } from "resend";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      contact_name,
      contact_email,
      contact_phone,
      company_name,
      company_website,
      answers = {},
    } = body ?? {};

    if (!contact_email) {
      return NextResponse.json(
        { error: "contact_email is required" },
        { status: 400 }
      );
    }

    // 1) Save to DB first (source of truth)
    const { data: inserted, error } = await supabaseServer
      .from("intake_submissions")
      .insert({
        status: "submitted",
        source: "elevate",
        contact_name,
        contact_email,
        contact_phone,
        company_name,
        company_website,
        answers,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Database insert failed", details: error.message ?? error },
        { status: 500 }
      );
    }

    // 2) Attempt email notification (non-blocking)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.ELEVATE_NOTIFY_EMAIL;

    console.log("ENV CHECK:", {
      hasResendKey: Boolean(RESEND_API_KEY),
      notifyEmail: notifyEmail ?? null,
    });

    let emailResult: any = { attempted: false };

    if (RESEND_API_KEY && notifyEmail) {
      emailResult.attempted = true;

      try {
        const resend = new Resend(RESEND_API_KEY);

        const textLines = [
          "New Elevate Intake Submission",
          "",
          `Name: ${contact_name || ""}`,
          `Email: ${contact_email || ""}`,
          `Phone: ${contact_phone || ""}`,
          `Company: ${company_name || ""}`,
          `Website: ${company_website || ""}`,
          "",
          "Answers:",
          JSON.stringify(answers, null, 2),
          "",
          `Submission ID: ${inserted.id}`,
        ];

        const res = await resend.emails.send({
          from: "OTwoOne Elevate <onboarding@resend.dev>",
          to: notifyEmail,
          subject: `New Elevate intake — ${contact_name || "New lead"}`,
          text: textLines.join("\n"),
        });

        console.log("RESEND RESPONSE:", res);

        // Resend typically returns { data, error }
        if ((res as any)?.error) {
          emailResult = {
            attempted: true,
            sent: false,
            error: (res as any).error,
          };
        } else {
          emailResult = {
            attempted: true,
            sent: true,
            data: (res as any)?.data ?? res,
          };
        }
      } catch (err: any) {
        console.error("Resend send error:", err);
        emailResult = {
          attempted: true,
          sent: false,
          error: err?.message ?? String(err),
        };
      }
    } else {
      emailResult = {
        attempted: false,
        reason: !RESEND_API_KEY
          ? "Missing RESEND_API_KEY"
          : "Missing ELEVATE_NOTIFY_EMAIL",
      };
    }

    return NextResponse.json({
      success: true,
      id: inserted.id,
      email: emailResult,
    });
  } catch (e: any) {
    console.error("Submit route error:", e);
    return NextResponse.json(
      { error: "Invalid request", details: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}