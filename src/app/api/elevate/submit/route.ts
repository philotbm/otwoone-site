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
        <div style="background:#eef2f7; padding:32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

          <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
            <div style="background:#0f172a; padding:24px;">
              <div style="text-align:center;">
                <img
                  src="https://www.otwoone.ie/branding/otwoone-logo-black.png"
                  width="180"
                  height="60"
                  alt="OTwoOne"
                  style="max-width:180px; width:100%; height:auto; display:block; margin:0 auto 12px;"
                />
                  <p style="margin:12px 0 0; font-size:13px; color:#e2e8f0; font-weight:600;">
                    New Elevate Intake Submission
                  </p>
            </div>
          </div>

            <!-- Body -->
            <div style="padding:24px;">

              <!-- Contact Card -->
              <div style="margin-bottom:24px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                <p style="margin:0 0 8px;"><strong>Name:</strong> ${contact_name || "-"}</p>
                <p style="margin:0 0 8px;"><strong>Email:</strong> ${contact_email || "-"}</p>
                <p style="margin:0 0 8px;"><strong>Phone:</strong> ${contact_phone || "-"}</p>
                <p style="margin:0 0 8px;"><strong>Company:</strong> ${company_name || "-"}</p>
                <p style="margin:0;"><strong>Website:</strong> ${websiteHtml}</p>
              </div>

              <!-- Answers -->
              <h2 style="margin:0 0 12px; font-size:16px; color:#1e293b;">Project Details</h2>

              <table style="width:100%; border-bottom:1px solid #e2e8f0; font-size:14px;">
                <tbody>
                  ${answersTableRows}
                </tbody>
              </table>

              <!-- Footer Meta -->
              <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b;">
                <p style="margin:0 0 4px;"><strong>Submission ID:</strong> ${inserted.id}</p>
                <p style="margin:0 0 4px;"><strong>Status:</strong> submitted</p>
                <p style="margin:0;"><strong>Source:</strong> elevate</p>
              </div>

            </div>
          </div>

          <p style="text-align:center; font-size:11px; color:#94a3b8; margin-top:16px;">
            OTwoOne · Cork, Ireland · www.otwoone.ie
          </p>

        </div>
        `
        });

        // --- Auto-reply to the person who submitted (contact_email) ---
        if (contact_email) {
          await resend.emails.send({
            from: "OTwoOne <info@otwoone.ie>",
            to: contact_email,
            replyTo: "info@otwoone.ie",
            subject: "We've received your Elevate submission",
            text: [
              "Thanks — we've received your Elevate submission.",
              "",
              "What happens next:",
              "• We'll review your details and reply within 1 business day.",
              "• If anything is urgent, just reply to this email.",
              "",
              "OTwoOne — Cork, Ireland",
              "www.otwoone.ie",
            ].join("\n"),
            html: `
      <div style="background:#eef2f7; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
          
          <!-- Header -->
          <div style="background:#0f172a; padding:24px;">
            <div style="text-align:center;">
              <img
                src="https://www.otwoone.ie/branding/otwoone-logo-black.png"
                alt="OTwoOne"
                style="max-width:180px; width:100%; height:auto; display:block; margin:0 auto;"
              />
              <p style="margin:12px 0 0; font-size:13px; color:#cbd5e1;">
                Thanks — we've received your submission
              </p>
            </div>
          </div>

          <!-- Body -->
          <div style="padding:24px; color:#0f172a;">
            <p style="margin:0 0 12px; font-size:15px; line-height:1.5;">
              Hi${contact_name ? ` ${contact_name}` : ""}, thanks for reaching out.
            </p>

            <div style="margin:16px 0; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
              <p style="margin:0 0 10px; font-weight:600;">What happens next</p>
              <ul style="margin:0; padding-left:18px; line-height:1.6;">
                <li>We'll review your details and reply within <strong>1 business day</strong>.</li>
                <li>If anything is urgent, just reply to this email.</li>
              </ul>
            </div>

            <p style="margin:16px 0 0; font-size:13px; color:#475569;">
              Submitted from Elevate on <strong>otwoone.ie</strong>.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:16px 24px; border-top:1px solid #e2e8f0; text-align:center; font-size:11px; color:#94a3b8;">
            OTwoOne &nbsp;•&nbsp; Cork, Ireland &nbsp;•&nbsp; www.otwoone.ie
          </div>

        </div>
      </div>
    `,
          });
        }

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