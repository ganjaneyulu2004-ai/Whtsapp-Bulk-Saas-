import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            businessName: true,
            mobile: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const pending = subscriptions.filter((s) => s.status === "PENDING_VERIFICATION");
    const approved = subscriptions.filter((s) => s.status === "ACTIVE");
    const rejected = subscriptions.filter((s) => s.status === "REJECTED" || s.status === "EXPIRED");

    return NextResponse.json({
      pending,
      approved,
      rejected,
      counts: {
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const body = await req.json();
    const { subscriptionId, action, adminNote } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId is required" }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (action === "APPROVE") {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "ACTIVE",
          startDate: now,
          endDate,
          approvedAt: now,
          adminNote: adminNote?.trim() || null,
        },
      });

      return NextResponse.json({ success: true, subscription: updated });
    } else if (action === "REJECT") {
      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "REJECTED",
          adminNote: adminNote?.trim() || "Payment verification failed. Invalid UTR or amount mismatch.",
        },
      });

      return NextResponse.json({ success: true, subscription: updated });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
