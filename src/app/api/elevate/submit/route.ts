import { Resend } from "resend";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

type Confidence = "high" | "medium" | "low";

type ComputedSupport =
  | null
  | {
      recommended: "essential" | "growth" | "partner";
      monthly: number;
      annual_value: number;
    };

type ComputedQuote = {
  currency: "EUR";
  low: number;
  high: number;
  confidence: Confidence;
  drivers: string[];
  assumptions: string[];
};

type ComputedResult = {
  quote: ComputedQuote;
  support: ComputedSupport;
  followups: string[];
};

function clampMoney(n: number) {
  return Math.max(0, Math.round(n / 50) * 50);
}

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

  return titled.replace(/\bAi\b/g, "AI").replace(/\bM365\b/g, "M365");
}

/**
 * Internal estimator.
 * - Supports V1 keys (current form): need_help, website_type, has_branding, branding_need, budget, timing
 * - Supports V2 keys (future): services[], primary_service, website{...}, branding{...}
 *
 * Solo OTwoOne support model:
 * - Branding-only => no recurring recommendation (support=null)
 * - Website => essential by default, growth if multi/large
 * - Automation => partner
 */
function computeQuote(answers: any): ComputedResult {
  // ---------- Service mapping (V2 first, then fallback to V1) ----------
  const serviceFromV1 = String(answers?.need_help ?? "").toLowerCase();

  const services: string[] =
    Array.isArray(answers?.services) && answers.services.length
      ? answers.services
      : serviceFromV1
      ? [
          serviceFromV1.includes("website") ? "website" : "",
          serviceFromV1.includes("automation") ? "automation" : "",
          serviceFromV1.includes("backend") ? "automation" : "",
          serviceFromV1.includes("branding") ? "branding" : "",
          serviceFromV1.includes("consult") ? "strategy" : "",
          serviceFromV1.includes("not sure") ? "unknown" : "",
        ].filter(Boolean)
      : [];

  const primary: string = answers?.primary_service ?? services[0] ?? "unknown";

  // ---------- Accumulators ----------
  let low = 0;
  let high = 0;

  const drivers: string[] = [];
  const assumptions: string[] = [];
  const followups: string[] = [];

  const add = (l: number, h: number, label?: string) => {
    low += l;
    high += h;
    if (label) drivers.push(label);
  };

  // ---------- V1 signals ----------
  const websiteTypeV1 = String(answers?.website_type ?? "").toLowerCase(); // e.g. "multi"
  const hasBrandingV1 = String(answers?.has_branding ?? "").toLowerCase(); // "no" | "partial" | "yes"
  const brandingNeedV1 = String(answers?.branding_need ?? "").trim().toLowerCase(); // e.g. "logo", "identity"
  const budgetV1 = String(answers?.budget ?? "").toLowerCase();
  const timingV1 = String(answers?.timing ?? "").toLowerCase();

  // ---------- V2 objects ----------
  const w = answers?.website ?? {};
  const b = answers?.branding ?? {};

  // ---------- Bases ----------
  if (services.includes("website")) add(2500, 4000, "Website base");
  if (services.includes("automation")) add(2000, 5000, "Systems base");
  if (services.includes("branding")) add(800, 2500, "Branding base");
  if (services.includes("strategy")) add(600, 1500, "Strategy base");

  // ---------- Website modifiers (V2 + V1 fallback) ----------
  if (services.includes("website")) {
    // V2 pages
    if (w.pages === "2_5") add(600, 1200, "Pages: 2–5");
    else if (w.pages === "6_10") add(1200, 2400, "Pages: 6–10");
    else if (w.pages === "10_plus") add(2400, 4500, "Pages: 10+");

    // V2 integrations
    const integrations: string[] = Array.isArray(w.integrations) ? w.integrations : [];
    if (integrations.length) {
      add(
        250 * integrations.length,
        600 * integrations.length,
        `Integrations: ${integrations.length}`
      );
    }

    // V2 content readiness
    if (w.content_ready === "none") add(600, 1500, "Content support needed");

    // V1 website type fallback
    if (websiteTypeV1) {
      if (websiteTypeV1.includes("multi")) add(800, 1600, "Website: multi-page");
      if (websiteTypeV1.includes("landing")) add(0, 400, "Website: landing page");
      if (websiteTypeV1.includes("ecom")) add(2500, 5000, "Website: ecommerce");
    } else if (!w.pages) {
      followups.push("Confirm website size / page count");
    }
  }

  // ---------- Branding modifiers ----------
  if (services.includes("branding")) {
    if (b.scope === "refresh") add(600, 1200, "Brand refresh");
    else if (b.scope === "full_identity") add(1500, 3000, "Full identity");
    else if (!brandingNeedV1) followups.push("Branding: refresh or full identity?");
  } else {
    // V1 branding signal (used for quote only; not for support recurring)
    if (hasBrandingV1 === "no") add(600, 1500, "Branding needed");
    if (hasBrandingV1 === "partial") add(300, 900, "Branding partial");
    if (brandingNeedV1) drivers.push(`Branding need: ${brandingNeedV1}`);
  }

  // ---------- Bundle uplift (quote only) ----------
  // This reflects coordination effort (even if branding is project-based).
  const hasAnyBrandingSignal =
    services.includes("branding") || hasBrandingV1 === "no" || hasBrandingV1 === "partial" || Boolean(brandingNeedV1);

  if (services.includes("website") && hasAnyBrandingSignal) {
    add(300, 800, "Website + Branding alignment");
  }

  // ---------- Confidence ----------
  let confidence: Confidence = "high";

  if (!services.length || services.includes("unknown") || primary === "unknown") {
    confidence = "low";
  }

  if (services.includes("website") && !w.pages && !websiteTypeV1) confidence = "medium";
  if (services.includes("branding") && !b.scope && !brandingNeedV1) confidence = "medium";

  // ---------- Light heuristics ----------
  if (budgetV1.includes("under") && (budgetV1.includes("3k") || budgetV1.includes("3000"))) {
    assumptions.push("Budget indicated: under €3k (may require phased scope)");
    high += 250;
  }

  if (timingV1.includes("asap")) {
    assumptions.push("Timeline: ASAP (may require prioritisation / phased delivery)");
  }

  // ---------- Round + ensure sensible width ----------
  low = clampMoney(low);
  high = clampMoney(Math.max(high, low + 500));

  // ---------- SUPPORT RECOMMENDATION (Solo OTwoOne model) ----------
  let support: ComputedSupport = null;

  // Automation => Partner
  if (services.includes("automation")) {
    const monthly = 249;
    support = { recommended: "partner", monthly, annual_value: monthly * 12 };
  }
  // Website => Essential (default), Growth if multi/large
  else if (services.includes("website")) {
    let recommended: "essential" | "growth" = "essential";
    let monthly = 79;

    const isLargerWebsite =
      websiteTypeV1.includes("multi") ||
      w.pages === "2_5" ||
      w.pages === "6_10" ||
      w.pages === "10_plus";

    if (isLargerWebsite) {
      recommended = "growth";
      monthly = 149;
    }

    support = { recommended, monthly, annual_value: monthly * 12 };
  }
  // Branding-only => support stays null

  return {
    quote: {
      currency: "EUR",
      low,
      high,
      confidence,
      drivers,
      assumptions,
    },
    support,
    followups,
  };
}

type EmailResult =
  | { attempted: false; reason?: string }
  | { attempted: true; sent: true; data?: unknown }
  | { attempted: true; sent: false; error: string };

type ResendSendResponse = {
  data?: unknown;
  error?: unknown;
};

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
      return NextResponse.json({ error: "contact_email is required" }, { status: 400 });
    }

    // 0) Internal compute: quote + support recommendation (stored in answers)
    const computed = computeQuote(answers);
    (answers as any).computed = computed;

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
        { error: "Database insert failed", details: (error as any)?.message ?? String(error) },
        { status: 500 }
      );
    }

    // 2) Attempt email notification
    const notifyEmail = process.env.ELEVATE_NOTIFY_EMAIL;

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

      const subject = `Elevate Submission • ${contact_name || "New lead"} • ${inserted.id}`;

      // --- Email formatting helpers ---
      const websiteRaw = (company_website || "").trim();
      const websiteHref =
        websiteRaw && !/^https?:\/\//i.test(websiteRaw) ? `https://${websiteRaw}` : websiteRaw;

      const websiteHtml = websiteHref
        ? `<a href="${escapeHtml(websiteHref)}" style="color:#2563eb; text-decoration:underline;">${escapeHtml(
            websiteRaw
          )}</a>`
        : "Not provided.";

      const safeName = contact_name ? escapeHtml(contact_name) : "Not provided.";
      const safeEmail = contact_email ? escapeHtml(contact_email) : "Not provided.";
      const safePhone = contact_phone ? escapeHtml(contact_phone) : "Not provided.";
      const safeCompany = company_name ? escapeHtml(company_name) : "Not provided.";

      // Build "Project Details" from answers, but hide computed JSON
      const answersObj = (answers ?? {}) as Record<string, unknown>;
      const answerEntries = Object.entries(answersObj);

      const answersTableRows =
        answerEntries.length > 0
          ? answerEntries
              .map(([k, v]) => {
                if (k === "computed") return "";

                if (v === null || v === undefined) return "";
                const raw = typeof v === "string" ? v.trim() : String(v).trim();
                if (!raw) return "";

                const key = escapeHtml(humanizeKey(k));

                const val =
                  typeof v === "string" ? escapeHtml(v) : escapeHtml(JSON.stringify(v, null, 2));

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

      const answersHtml =
        answersTableRows.trim().length > 0
          ? answersTableRows
          : `<div style="font-size:14px; color:#334155;">No project details provided.</div>`;

      const supportLine = computed.support
        ? `${computed.support.recommended} (€${computed.support.monthly}/month)`
        : "Not applicable (project-based)";

      const annualLine = computed.support ? `€${computed.support.annual_value}` : "—";

      const res = (await resend.emails.send({
        from: "OTwoOne Elevate Intake <info@otwoone.ie>",
        to: notifyEmail,
        subject,
        text: [
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
        ].join("\n"),
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

      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />

      <h3 style="margin:0 0 12px 0;font-size:16px;color:#1f293b;">Internal Estimate</h3>

      <p style="margin:4px 0;">
        <strong>Range:</strong>
        €${computed.quote.low} – €${computed.quote.high}
      </p>

      <p style="margin:4px 0;">
        <strong>Confidence:</strong>
        ${computed.quote.confidence}
      </p>

      <p style="margin:4px 0;">
        <strong>Recommended Support:</strong>
        ${supportLine}
      </p>

      <p style="margin:4px 0;">
        <strong>Annual Recurring:</strong>
        ${annualLine}
      </p>

      ${
        computed.followups?.length
          ? `<p style="margin:12px 0 0; font-size:13px; color:#475569;"><strong>Follow-ups:</strong> ${escapeHtml(
              computed.followups.join(" • ")
            )}</p>`
          : ""
      }

      <!-- Footer Meta -->
      <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b;">
        <p style="margin:0 0 4px;"><strong>Submission ID:</strong> ${escapeHtml(inserted.id)}</p>
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
        emailResult = { attempted: true, sent: false, error: toErrorMessage(res.error) };
      } else {
        emailResult = { attempted: true, sent: true, data: res?.data };
      }

      // --- Auto-reply to the person who submitted ---
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

    <div style="padding:18px 24px; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; color:#64748b;">
      OTwoOne, Cork, Ireland. www.otwoone.ie
    </div>

  </div>
</div>
          `,
        });
      }
    } catch (err: unknown) {
      emailResult = { attempted: true, sent: false, error: toErrorMessage(err) };
    }

    return NextResponse.json({ success: true, id: inserted.id, email: emailResult });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Invalid request", details: toErrorMessage(e) },
      { status: 400 }
    );
  }
}