import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = "admin_token";

function isAuthorized(request: NextRequest, expectedToken: string): boolean {
  const headerToken = request.headers.get("x-admin-token")?.trim() ?? "";
  const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value?.trim() ?? "";
  const providedToken = headerToken || cookieToken;
  return providedToken.length > 0 && providedToken === expectedToken;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const expectedToken = process.env.ADMIN_INGEST_TOKEN?.trim() ?? "";
  if (!expectedToken) {
    return new NextResponse("Server is missing ADMIN_INGEST_TOKEN", { status: 500 });
  }

  if (isAuthorized(request, expectedToken)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
