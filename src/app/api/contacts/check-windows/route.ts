import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ error: "Business account not found" }, { status: 403 });
    }

    const body = await req.json();
    const { phones } = body; // Array of normalized phone numbers e.g. ["919876543210", ...]

    if (!phones || !Array.isArray(phones)) {
      return NextResponse.json({ windowCount: 0, outsideCount: 0, windowPhones: [] });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Strictly scope 24h incoming message check to this businessId
    const recentIncoming = await prisma.incomingMessage.findMany({
      where: {
        businessId: business.id,
        timestamp: { gte: twentyFourHoursAgo },
      },
      select: { fromPhone: true, timestamp: true },
    });

    const windowPhonesSet = new Set<string>();

    for (const phone of phones) {
      const cleanDigits = String(phone || "").replace(/[^0-9]/g, "");
      if (!cleanDigits) continue;
      const match = recentIncoming.find(
        (inc) =>
          cleanDigits.endsWith(inc.fromPhone.slice(-10)) ||
          inc.fromPhone.endsWith(cleanDigits.slice(-10))
      );
      if (match) {
        windowPhonesSet.add(phone);
      }
    }

    const windowPhones = Array.from(windowPhonesSet);
    const windowCount = windowPhones.length;
    const outsideCount = Math.max(0, phones.length - windowCount);

    return NextResponse.json({
      windowCount,
      outsideCount,
      windowPhones,
      total: phones.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
