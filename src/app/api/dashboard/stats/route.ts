import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30days";
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";

    let businessWhere: any = {};

    if (!isAdmin) {
      if (session?.user?.id) {
        const userBizs = await prisma.business.findMany({
          where: { userId: session.user.id },
          select: { id: true },
        });
        const bizIds = userBizs.map((b) => b.id);
        businessWhere = { businessId: { in: bizIds } };
      } else {
        const biz = await getCurrentBusiness();
        businessWhere = { businessId: biz.id };
      }
    }

    // Determine date filter
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    if (range === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "7days") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30days") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "custom" && customStart) {
      startDate = new Date(customStart);
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const campaignDateFilter: any = {};
    if (startDate) {
      campaignDateFilter.gte = startDate;
    }
    if (endDate) {
      campaignDateFilter.lte = endDate;
    }

    const campaignWhere: any = {
      ...businessWhere,
      ...(startDate ? { createdAt: campaignDateFilter } : {}),
    };

    const campaigns = await prisma.campaign.findMany({
      where: campaignWhere,
      include: {
        template: {
          select: { name: true, category: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalFailed = 0;

    const formattedCampaigns = campaigns.map((c) => {
      totalSent += c.sentCount;
      totalDelivered += c.deliveredCount;
      totalRead += c.readCount;
      totalFailed += c.failedCount;

      const notRead = Math.max(0, c.deliveredCount - c.readCount);
      const readRate = c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 100) : 0;

      return {
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        sentCount: c.sentCount,
        deliveredCount: c.deliveredCount,
        readCount: c.readCount,
        notReadCount: notRead,
        failedCount: c.failedCount,
        readRate,
        createdAt: c.createdAt.toISOString(),
      };
    });

    const totalNotRead = Math.max(0, totalDelivered - totalRead);
    const overallReadRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

    // Fetch top failed reasons from MessageLog
    const failedLogs = await prisma.messageLog.findMany({
      where: {
        status: "FAILED",
        ...(campaigns.length > 0 ? { campaignId: { in: campaigns.map((c) => c.id) } } : {}),
      },
      select: {
        errorCode: true,
        errorMessage: true,
      },
      take: 20,
    });

    const failureReasonsMap: { [key: string]: { count: number; code?: string; message: string } } = {};
    for (const fl of failedLogs) {
      const msg = fl.errorMessage || fl.errorCode || "Unknown WhatsApp delivery issue";
      if (!failureReasonsMap[msg]) {
        failureReasonsMap[msg] = { count: 0, code: fl.errorCode || undefined, message: msg };
      }
      failureReasonsMap[msg].count++;
    }

    const failureReasons = Object.values(failureReasonsMap);

    // Compute Daily Chart Data (last 7 or 30 days)
    const daysCount = range === "today" ? 1 : range === "7days" ? 7 : 14;
    const dailyMap: { [key: string]: { date: string; sent: number; delivered: number; read: number } } = {};

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap[key] = { date: label, sent: 0, delivered: 0, read: 0 };
    }

    for (const c of campaigns) {
      const cDate = c.createdAt.toISOString().split("T")[0];
      if (dailyMap[cDate]) {
        dailyMap[cDate].sent += c.sentCount;
        dailyMap[cDate].delivered += c.deliveredCount;
        dailyMap[cDate].read += c.readCount;
      }
    }

    const chartData = Object.values(dailyMap);

    return NextResponse.json({
      stats: {
        totalSent,
        totalDelivered,
        totalRead,
        totalNotRead,
        totalFailed,
        readRate: overallReadRate,
      },
      failureReasons,
      chartData,
      recentCampaigns: formattedCampaigns,
      isAdmin,
    });
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
