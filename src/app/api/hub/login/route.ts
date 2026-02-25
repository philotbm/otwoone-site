import { NextResponse } from "next/server";

const HUB_COOKIE = "hub_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const secret = process.env.HUB_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "HUB_SECRET not configured" },
        { status: 500 }
      );
    }

    if (!password || password !== secret) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set(HUB_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SEVEN_DAYS,
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
