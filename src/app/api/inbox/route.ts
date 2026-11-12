import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ error: "Business account not found" }, { status: 403 });
    }

    // Strictly isolate to the logged-in user's businessId (never return null or other businesses)
    const messages = await prisma.incomingMessage.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const formatted = messages.map((m) => {
      const isWindowActive = m.timestamp >= twentyFourHoursAgo;
      const hoursRemaining = isWindowActive
        ? Math.max(0, Math.round((m.timestamp.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60)))
        : 0;

      return {
        ...m,
        isWindowActive,
        hoursRemaining,
      };
    });

    return NextResponse.json(
      {
        messages: formatted,
        totalCount: formatted.length,
        activeWindowCount: formatted.filter((f) => f.isWindowActive).length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
