import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const messages = await prisma.incomingMessage.findMany({
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
