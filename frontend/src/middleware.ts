import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/forgot-password", "/widget"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === "/") {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (!token && (pathname.startsWith("/super-admin") || pathname.startsWith("/client"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
