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
    pathname === "/api/campaigns/status"
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
      // Unauthenticated visitor -> Public landing page & demo test scanner
      return NextResponse.next();
    }
    // Authenticated user
    if (token.role === "ADMIN") {
      return NextResponse.next();
    }
    const subStatus = (token.subscriptionStatus as string) || "AWAITING_PAYMENT";
    if (subStatus === "ACTIVE") {
      return NextResponse.next();
    }
    if (subStatus === "PENDING_VERIFICATION") {
      return NextResponse.redirect(new URL("/payment-pending", req.url));
    }
    // Direct unpaid user to payment collection
    return NextResponse.redirect(new URL("/complete-payment", req.url));
  }

  // 5. Public pages for unauthenticated visitors (/login, /register, /test)
  if (pathname === "/login" || pathname === "/register" || pathname === "/test") {
    if (token) {
      // If already logged in, redirect away from login/register to appropriate page
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      const subStatus = (token.subscriptionStatus as string) || "AWAITING_PAYMENT";
      if (subStatus === "ACTIVE") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      if (subStatus === "PENDING_VERIFICATION") {
        return NextResponse.redirect(new URL("/payment-pending", req.url));
      }
      return NextResponse.redirect(new URL("/complete-payment", req.url));
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
    // If admin visits payment collection or pending pages, redirect to dashboard
    if (pathname === "/complete-payment" || pathname === "/payment-pending") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 8. USER role: block /admin routes
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const subStatus = (token.subscriptionStatus as string) || "AWAITING_PAYMENT";

  // 9. Payment Collection Page (/complete-payment)
  if (pathname === "/complete-payment") {
    if (subStatus === "ACTIVE") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (subStatus === "PENDING_VERIFICATION") {
      return NextResponse.redirect(new URL("/payment-pending", req.url));
    }
    return NextResponse.next();
  }

  // 10. Payment Pending Verification Page (/payment-pending)
  if (pathname === "/payment-pending") {
    if (subStatus === "ACTIVE") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (subStatus === "PENDING_VERIFICATION") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/complete-payment", req.url));
  }

  // 11. Allow essential APIs for subscription verification & payment
  if (
    pathname.startsWith("/api/subscription") ||
    pathname === "/api/business/profile"
  ) {
    return NextResponse.next();
  }

  // 12. Protect all other pages & APIs (/create-campaign, /campaigns, /inbox, /settings, /billing, etc.)
  if (subStatus !== "ACTIVE") {
    if (subStatus === "PENDING_VERIFICATION") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Payment verification pending. Access will unlock once approved.", code: "PAYMENT_PENDING" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/payment-pending", req.url));
    }

    // Direct user to payment collection
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Active subscription required. Please collect and complete payment.", code: "PAYMENT_REQUIRED" },
        { status: 403 }
      );
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
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
