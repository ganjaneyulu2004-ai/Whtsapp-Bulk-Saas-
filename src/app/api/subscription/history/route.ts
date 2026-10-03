import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const activeSub = subscriptions.find((s) => s.status === "ACTIVE");
    let daysRemaining = 0;
    let isExpiringSoon = false;

    if (activeSub && activeSub.endDate) {
      const diffMs = new Date(activeSub.endDate).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (daysRemaining <= 3 && daysRemaining >= 0) {
        isExpiringSoon = true;
      }
    }

    return NextResponse.json({
      subscriptions,
      currentSubscription: activeSub || subscriptions[0] || null,
      daysRemaining,
      isExpiringSoon,
      isAdmin: session.user.role === "ADMIN",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
