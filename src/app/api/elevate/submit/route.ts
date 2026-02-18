import { Resend } from "resend";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

type EmailResult =
  | { attempted: false; reason?: string }
  | { attempted: true; sent: true; data?: unknown }
  | { attempted: true; sent: false; error: string };

type ResendSendResponse = {
  data?: unknown;
  error?: unknown;
};

function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  try {
    return typeof err === "string" ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function humanizeKey(raw: string) {
  const spaced = raw.replace(/_/g, " ").trim();

  const titled = spaced.replace(/\w\S*/g, (w) => {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return titled
    .replace(/\bAi\b/g, "AI")
    .replace(/\bM365\b/g, "M365");
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
        { error: "Database insert failed", details: error.message ?? String(error) },
        { status: 500 }
      );
    }

    console.log("SUPABASE INSERT OK:", inserted);

    // 2) Attempt email notification
    const notifyEmail = process.env.ELEVATE_NOTIFY_EMAIL;

    console.log("ENV CHECK:", {
      hasResendKey: Boolean(RESEND_API_KEY),
      notifyEmail: notifyEmail ?? null,
    });

    let emailResult: EmailResult = { attempted: false };

    if (!RESEND_API_KEY) {
      emailResult = { attempted: false, reason: "Missing RESEND_API_KEY" };
      return NextResponse.json({ success: true, id: inserted.id, email: emailResult });
    }

    if (!notifyEmail) {
      emailResult = { attempted: false, reason: "Missing ELEVATE_NOTIFY_EMAIL" };
      return NextResponse.json({ success: true, id: inserted.id, email: emailResult });
    }

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

      const subject = `Elevate Submission • ${contact_name || "New lead"} • ${
        inserted.id
      }`;

      // --- Email formatting helpers ---
      const websiteRaw = (company_website || "").trim();
      const websiteHref =
        websiteRaw && !/^https?:\/\//i.test(websiteRaw)
          ? `https://${websiteRaw}`
          : websiteRaw;

      const websiteHtml = websiteHref
        ? `<a href="${escapeHtml(
            websiteHref
          )}" style="color:#2563eb; text-decoration:underline;">${escapeHtml(
            websiteRaw
          )}</a>`
        : "Not provided.";

      const safeName = contact_name ? escapeHtml(contact_name) : "Not provided.";
      const safeEmail = contact_email ? escapeHtml(contact_email) : "Not provided.";
      const safePhone = contact_phone ? escapeHtml(contact_phone) : "Not provided.";
      const safeCompany = company_name ? escapeHtml(company_name) : "Not provided.";

      const answersObj = (answers ?? {}) as Record<string, unknown>;
      const answerEntries = Object.entries(answersObj);

      const answersTableRows =
        answerEntries.length > 0
          ? answerEntries
              .map(([k, v]) => {
                // Skip empties entirely (removes "Not provided." noise)
                if (v === null || v === undefined) return "";
                const raw = typeof v === "string" ? v.trim() : String(v).trim();
                if (!raw) return "";

                const key = escapeHtml(humanizeKey(k));

                const val =
                  typeof v === "string"
                    ? escapeHtml(v)
                    : escapeHtml(JSON.stringify(v, null, 2));

                return `
<div style="margin:0 0 16px;">
  <div style="font-size:13px; font-weight:600; color:#0f172a; margin:0 0 6px;">
    ${key}
  </div>
  <div style="font-size:14px; line-height:1.6; color:#334155; white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere;">
    ${val}
  </div>
</div>
`;
              })
              .filter(Boolean)
              .join("")
          : "";

      // If everything was empty, show a single subtle line
      const answersHtml =
        answersTableRows.trim().length > 0
          ? answersTableRows
          : `<div style="font-size:14px; color:#334155;">No project details provided.</div>`;

      const res = (await resend.emails.send({
        from: "OTwoOne Elevate Intake <info@otwoone.ie>",
        to: notifyEmail,
        subject,
        text: textLines.join("\n"),
        html: `
<div style="background:#eef2f7; padding:32px 16px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
        <p style="margin:0 0 8px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin:0 0 8px;"><strong>Phone:</strong> ${safePhone}</p>
        <p style="margin:0 0 8px;"><strong>Company:</strong> ${safeCompany}</p>
        <p style="margin:0;"><strong>Website:</strong> ${websiteHtml}</p>
      </div>

      <!-- Answers -->
      <h2 style="margin:0 0 12px; font-size:16px; color:#1e293b;">Project Details</h2>

      <div style="border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
        ${answersHtml}
      </div>

      <!-- Footer Meta -->
      <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b;">
        <p style="margin:0 0 4px;"><strong>Submission ID:</strong> ${escapeHtml(
          inserted.id
        )}</p>
        <p style="margin:0 0 4px;"><strong>Status:</strong> submitted</p>
        <p style="margin:0;"><strong>Source:</strong> elevate</p>
      </div>

    </div>
  </div>

  <p style="text-align:center; font-size:11px; color:#94a3b8; margin-top:16px;">
    OTwoOne, Cork, Ireland. www.otwoone.ie
  </p>
</div>
        `,
      })) as ResendSendResponse;

      if (res?.error) {
        console.error("RESEND ERROR:", res.error);
        emailResult = {
          attempted: true,
          sent: false,
          error: toErrorMessage(res.error),
        };
      } else {
        console.log("RESEND SENT:", res?.data);
        emailResult = { attempted: true, sent: true, data: res?.data };
      }

      // --- Auto-reply to the person who submitted (contact_email) ---
      if (contact_email) {
        await resend.emails.send({
          from: "OTwoOne <info@otwoone.ie>",
          to: contact_email,
          replyTo: "info@otwoone.ie",
          subject: "We've received your OTwoOne Elevate details",
          text: [
            `Hi ${contact_name || "there"},`,
            "",
            "Thank you for reaching out to OTwoOne.",
            "We have received your details and will review them shortly.",
            "",
            "What happens next:",
            "• We will review your requirements.",
            "• You will receive a reply within 2 business days.",
            "• If needed, we can arrange a call to discuss your requirements in more detail.",
            "",
            "If anything is urgent, you can reply to this email.",
            "",
            "OTwoOne",
            "Cork, Ireland",
            "www.otwoone.ie",
          ].join("\n"),
          html: `
<div style="background:#eef2f7; padding:32px 16px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden;">

    <!-- Header -->
    <div style="background:#0f172a; padding:28px 24px; text-align:center;">
      <img
        src="https://www.otwoone.ie/branding/otwoone-logo-black.png"
        alt="OTwoOne"
        width="180"
        height="60"
        style="display:block; margin:0 auto;"
      />
      <p style="margin:16px 0 0; font-size:14px; color:#cbd5e1;">
        We've received your details
      </p>
    </div>

    <!-- Body -->
    <div style="padding:28px 24px; color:#0f172a;">

      <p style="margin:0 0 12px; font-size:16px; line-height:1.5;">
        Hi ${escapeHtml(contact_name || "there")},
      </p>

      <p style="margin:0 0 20px; font-size:15px; line-height:1.6;">
        Thank you for reaching out to OTwoOne. We have received your details and will review them shortly.
      </p>

      <div style="margin:0 0 24px; padding:18px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
        <p style="margin:0 0 10px; font-weight:600;">What happens next</p>
        <ul style="margin:0; padding-left:18px; line-height:1.6;">
          <li>We will review your requirements.</li>
          <li>You will receive a reply within 2 business days.</li>
          <li>If needed, we can arrange a call to discuss your requirements in more detail.</li>
        </ul>
      </div>

      <p style="margin:0 0 18px; font-size:14px;">
        If anything is urgent, you can reply to this email.
      </p>

      <p style="margin:0 0 24px; font-size:14px; color:#475569;">
        Submitted via OTwoOne Elevate on <strong>otwoone.ie</strong>.
      </p>

    </div>

    <!-- Footer -->
    <div style="padding:18px 24px; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; color:#64748b;">
      OTwoOne, Cork, Ireland. www.otwoone.ie
    </div>

  </div>
</div>
          `,
        });
      }
    } catch (err: unknown) {
      console.error("Resend send error:", err);
      emailResult = {
        attempted: true,
        sent: false,
        error: toErrorMessage(err),
      };
    }

    return NextResponse.json({
      success: true,
      id: inserted.id,
      email: emailResult,
    });
  } catch (e: unknown) {
    console.error("Submit route error:", e);
    return NextResponse.json(
      { error: "Invalid request", details: toErrorMessage(e) },
      { status: 400 }
    );
  }
}