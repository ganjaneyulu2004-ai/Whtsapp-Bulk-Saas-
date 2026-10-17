import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Static assets and branding files
  if (
    pathname.startsWith("/brand") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|avif|mp3|wav|ogg)$/i) ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png"
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
    // Both unauthenticated (landing page) and authenticated (dashboard) handled smoothly
    return NextResponse.next();
  }

  // 5. Public pages for unauthenticated visitors (/login, /register, /test, /demo-login)
  if (pathname === "/login" || pathname === "/register" || pathname === "/test" || pathname === "/demo-login") {
    if (token) {
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
