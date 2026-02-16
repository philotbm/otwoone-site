import { Resend } from "resend";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer"; 

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

    console.log("SUPABASE INSERT OK:", inserted);

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

        const subject = `Elevate Submission • ${contact_name || "New lead"} • ${inserted.id}`;

        // --- Email formatting helpers ---
        const websiteRaw = (company_website || "").trim();
        const websiteHref =
          websiteRaw && !/^https?:\/\//i.test(websiteRaw)
            ? `https://${websiteRaw}`
            : websiteRaw;

        const websiteHtml = websiteHref
          ? `<a href="${escapeHtml(websiteHref)}" style="color:#2563eb; text-decoration:underline;">${escapeHtml(websiteRaw)}</a>`
          : "—";

        const answersObj = (answers ?? {}) as Record<string, unknown>;
        const answerEntries = Object.entries(answersObj);

        const answersTableRows =
          answerEntries.length > 0
            ? answerEntries
              .map(([k, v]) => {
                const key = escapeHtml(k).replace(/_/g, " ");
                const val = escapeHtml(v) || "—";
                return `<tr>
            <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; font-weight:600; width:180px;">${key}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb;">${val}</td>
          </tr>`;
              })
              .join("")
            : `<tr>
        <td style="padding:8px 10px;" colspan="2">—</td>
      </tr>`;

        const res = await resend.emails.send({
          from: "OTwoOne Elevate Intake <info@otwoone.ie>",
          to: notifyEmail,
          subject,
          text: textLines.join("\n"), // keep plain-text fallback
          html: `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">New Elevate Intake Submission</h2>

      <div style="margin: 0 0 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <div><strong>Name:</strong> ${contact_name || ""}</div>
        <div><strong>Email:</strong> ${contact_email || ""}</div>
        <div><strong>Phone:</strong> ${contact_phone || ""}</div>
        <div><strong>Company:</strong> ${company_name || ""}</div>
        <div><strong>Website:</strong> ${websiteHtml}</div>
      </div>

<h3 style="margin: 24px 0 12px;">Answers</h3>

<table style="width:100%; border-collapse:collapse; font-size:14px; background:#ffffff; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden;">
  <tbody>
    ${answersTableRows}
  </tbody>
</table>

      <div style="font-size: 13px; color: #374151;">
        <strong>Submission ID:</strong> ${inserted.id}<br/>
        <strong>Status:</strong> submitted<br/>
        <strong>Source:</strong> elevate
      </div>
    </div>
  `,
        });

        // Always log a compact structured result
        if ((res as any)?.error) {
          console.error("RESEND ERROR:", (res as any).error);
        } else {
          console.log("RESEND SENT:", (res as any)?.data);
        }

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