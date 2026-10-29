import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Static assets, SEO endpoints, and branding files
  if (
    pathname.startsWith("/brand") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|avif|mp3|wav|ogg|xml|txt)$/i) ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  // 2. Completely public APIs
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname === "/api/campaigns/send-test" ||
    pathname === "/api/campaigns/status" ||
    pathname === "/api/init-db"
  ) {
    return NextResponse.next();
  }

  // 3. Read JWT token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 4. Handle Root "/"
  if (pathname === "/") {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // 5. Public pages for unauthenticated visitors (/login, /register, /privacy, /terms, /test, /demo-login)
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname === "/test" ||
    pathname === "/demo-login"
  ) {
    if (token && (pathname === "/login" || pathname === "/register")) {
      // If already logged in, redirect directly to dashboard
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 6. Not logged in -> Redirect to /login
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 7. ADMIN role has full access
  if (token.role === "ADMIN") {
    return NextResponse.next();
  }

  // 8. USER role: block /admin routes
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 9. USER role: if subscription is NOT active, force redirect to /complete-payment
  const allowedUnpaidPaths = [
    "/complete-payment",
    "/payment-pending",
    "/api/payment",
    "/api/subscription",
    "/api/auth",
    "/logout",
  ];

  const isAllowed = allowedUnpaidPaths.some((p) => pathname.startsWith(p));
  if (token.subscriptionStatus !== "ACTIVE" && !isAllowed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Payment required. Active plan needed." }, { status: 402 });
    }
    return NextResponse.redirect(new URL("/complete-payment", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|mp3)$).*)",
  ],
};
