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

    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        businesses: {
          select: { id: true, name: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userList = users.map((u) => {
      const sub = u.subscriptions[0] || null;
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        mobile: u.mobile,
        businessName: u.businessName || u.businesses[0]?.name || "N/A",
        role: u.role,
        createdAt: u.createdAt,
        plan: sub?.plan || "None",
        status: u.role === "ADMIN" ? "ACTIVE (Admin)" : sub?.status || "NO_SUBSCRIPTION",
        expiryDate: sub?.endDate || null,
        subscriptionId: sub?.id || null,
      };
    });

    return NextResponse.json({ users: userList });
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
    const { userId, action, days = 30, plan = "Growth" } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const latestSub = user.subscriptions[0];
    const now = new Date();

    if (action === "ACTIVATE" || action === "EXTEND") {
      let baseDate = now;
      if (action === "EXTEND" && latestSub?.endDate && new Date(latestSub.endDate) > now) {
        baseDate = new Date(latestSub.endDate);
      }
      const newEndDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      if (latestSub && latestSub.status !== "EXPIRED") {
        await prisma.subscription.update({
          where: { id: latestSub.id },
          data: {
            status: "ACTIVE",
            startDate: latestSub.startDate || now,
            endDate: newEndDate,
            approvedAt: now,
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            plan,
            amount: 0,
            status: "ACTIVE",
            startDate: now,
            endDate: newEndDate,
            approvedAt: now,
            adminNote: "Manually granted/extended by Admin",
          },
        });
      }

      return NextResponse.json({ success: true, message: `User updated with ${days} days active subscription.` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
