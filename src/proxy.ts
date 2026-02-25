import { NextRequest, NextResponse } from "next/server";

const HUB_COOKIE = "hub_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /hub/login is always public ──────────────────────────────────────────
  if (pathname.startsWith("/hub/login")) {
    return NextResponse.next();
  }

  // ── Protect all /hub/* pages ─────────────────────────────────────────────
  if (pathname.startsWith("/hub")) {
    const session = request.cookies.get(HUB_COOKIE)?.value;
    const secret = process.env.HUB_SECRET;

    if (!secret || session !== secret) {
      const loginUrl = new URL("/hub/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Protect all /api/hub/* routes (except /api/hub/login) ───────────────
  // Accepts either the session cookie or an x-hub-secret header
  // (header is useful for internal server-to-server calls like sp-sync)
  if (pathname.startsWith("/api/hub") && !pathname.startsWith("/api/hub/login")) {
    const session = request.cookies.get(HUB_COOKIE)?.value;
    const headerSecret = request.headers.get("x-hub-secret");
    const secret = process.env.HUB_SECRET;

    if (!secret || (session !== secret && headerSecret !== secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hub/:path*", "/api/hub/:path*"],
};
