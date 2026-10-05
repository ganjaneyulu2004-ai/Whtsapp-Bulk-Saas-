"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [activeAllowed, setActiveAllowed] = useState(false);

  useEffect(() => {
    // 1. Skip check for unauthenticated or public paths
    if (
      status === "loading" ||
      !session ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/test" ||
      pathname.startsWith("/api/")
    ) {
      setChecking(false);
      setActiveAllowed(true);
      return;
    }

    // 2. Admin has immediate full access
    if (session.user?.role === "ADMIN") {
      setChecking(false);
      setActiveAllowed(true);
      return;
    }

    // 3. User is on payment pages
    if (pathname === "/complete-payment" || pathname === "/payment-pending") {
      setActiveAllowed(true);
    }

    // 4. Check user subscription status from live database
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        const subStatus = data?.status || "AWAITING_PAYMENT";

        if (subStatus === "ACTIVE") {
          setActiveAllowed(true);
          if (pathname === "/complete-payment" || pathname === "/payment-pending") {
            router.replace("/");
          }
        } else if (subStatus === "PENDING_VERIFICATION") {
          setActiveAllowed(pathname === "/payment-pending");
          if (pathname !== "/payment-pending") {
            router.replace("/payment-pending");
          }
        } else {
          // AWAITING_PAYMENT, REJECTED, EXPIRED, etc.
          setActiveAllowed(pathname === "/complete-payment");
          if (pathname !== "/complete-payment") {
            router.replace("/complete-payment");
          }
        }
      })
      .catch(() => {
        // In case of error on protected page, redirect to payment
        if (pathname !== "/complete-payment" && pathname !== "/payment-pending") {
          router.replace("/complete-payment");
        }
      })
      .finally(() => {
        setChecking(false);
      });
  }, [session, status, pathname, router]);

  // If not authenticated or on public pages
  if (!session || pathname === "/login" || pathname === "/register" || pathname === "/test") {
    return <>{children}</>;
  }

  // Admin always has immediate access
  if (session?.user?.role === "ADMIN") {
    return <>{children}</>;
  }

  // If on payment collection or pending verification page
  if (pathname === "/complete-payment" || pathname === "/payment-pending") {
    return <>{children}</>;
  }

  // Block rendering of protected workspace content while checking or if payment is not active
  if (checking || !activeAllowed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
        <p className="text-slate-muted text-xs font-heading font-semibold">
          Verifying subscription access...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
