import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Completely public paths - bypass immediately
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png"
  ) {
    return NextResponse.next();
  }

  // 2. Read JWT token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 3. Not logged in -> Redirect to /login
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Admin role has full access
  if (token.role === "ADMIN") {
    // If admin accidentally visits payment pages, redirect to dashboard
    if (pathname === "/complete-payment" || pathname === "/payment-pending") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 5. User role: block /admin routes
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allow subscription pages and APIs for authenticated users
  if (
    pathname === "/complete-payment" ||
    pathname === "/payment-pending" ||
    pathname.startsWith("/api/subscription") ||
    pathname === "/billing"
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
