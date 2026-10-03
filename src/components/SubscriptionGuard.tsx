"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip check for unauthenticated or public paths
    if (
      status === "loading" ||
      !session ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/api/")
    ) {
      setChecking(false);
      return;
    }

    // Admin has immediate full access
    if (session.user?.role === "ADMIN") {
      setChecking(false);
      return;
    }

    // Check user subscription status
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        const subStatus = data?.status || "AWAITING_PAYMENT";

        if (subStatus === "ACTIVE") {
          if (pathname === "/complete-payment" || pathname === "/payment-pending") {
            router.replace("/");
          }
        } else if (subStatus === "PENDING_VERIFICATION") {
          if (pathname !== "/payment-pending") {
            router.replace("/payment-pending");
          }
        } else {
          // AWAITING_PAYMENT, REJECTED, EXPIRED, etc.
          if (pathname !== "/complete-payment") {
            router.replace("/complete-payment");
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setChecking(false);
      });
  }, [session, status, pathname, router]);

  return <>{children}</>;
}
