import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, username: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Admin bypass
  if (user.role === "ADMIN") {
    return NextResponse.json({
      role: "ADMIN",
      status: "ACTIVE",
      subscription: null,
      daysRemaining: 9999,
      isExpiringSoon: false,
    });
  }

  // Fetch latest subscription for USER
  const latestSub = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!latestSub) {
    return NextResponse.json({
      role: "USER",
      status: "AWAITING_PAYMENT",
      subscription: null,
      daysRemaining: 0,
      isExpiringSoon: false,
    });
  }

  // Check expiration if ACTIVE
  let currentStatus = latestSub.status;
  let daysRemaining = 0;
  let isExpiringSoon = false;

  if (latestSub.status === "ACTIVE" && latestSub.endDate) {
    const now = new Date();
    const expiry = new Date(latestSub.endDate);
    const diffMs = expiry.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) {
      currentStatus = "EXPIRED";
      await prisma.subscription.update({
        where: { id: latestSub.id },
        data: { status: "EXPIRED" },
      });
    } else if (daysRemaining <= 3) {
      isExpiringSoon = true;
    }
  }

  return NextResponse.json({
    role: "USER",
    status: currentStatus,
    subscription: {
      ...latestSub,
      status: currentStatus,
    },
    daysRemaining: Math.max(0, daysRemaining),
    isExpiringSoon,
  });
}
