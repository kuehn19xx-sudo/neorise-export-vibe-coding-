import { NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "admin_token";

type SessionPayload = {
  token?: string;
};

export async function POST(request: Request) {
  const expectedToken = process.env.ADMIN_INGEST_TOKEN?.trim() ?? "";
  if (!expectedToken) {
    return NextResponse.json({ error: "Server is missing ADMIN_INGEST_TOKEN" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as SessionPayload;
  const providedToken = String(body.token ?? "").trim();
  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, providedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
  return response;
}
