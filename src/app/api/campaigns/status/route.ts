import { NextResponse } from "next/server";
import { getMessageDeliveryStatus } from "@/lib/webhook-state";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wamid = searchParams.get("wamid");

  if (!wamid) {
    return NextResponse.json({ error: "wamid query parameter is required" }, { status: 400 });
  }

  const session = await getCurrentUserSession();
  const isAuthenticated = Boolean(session?.user?.id);
  const isAdmin = session?.user?.role === "ADMIN";

  // 1. Check in-memory fast webhook state (strip recipient PII unless authenticated)
  const memStatus = getMessageDeliveryStatus(wamid);
  if (memStatus) {
    return NextResponse.json({
      found: true,
      source: "live_webhook",
      status: memStatus.status,
      errorCode: memStatus.errorCode,
      errorTitle: memStatus.errorTitle,
      errorMessage: memStatus.errorMessage,
      ...(isAuthenticated ? { recipientId: memStatus.recipientId } : {}),
      timestamp: memStatus.timestamp,
    });
  }

  // 2. Database MessageLog lookup strictly requires authenticated session scoped to own businessId
  if (!isAuthenticated) {
    return NextResponse.json({
      found: false,
      status: "pending_meta",
      message: "Awaiting delivery confirmation from Meta WhatsApp network...",
    });
  }

  const business = isAdmin ? null : await getCurrentBusiness().catch(() => null);
  if (!isAdmin && !business?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbLog = await prisma.messageLog.findFirst({
    where: {
      waMessageId: wamid,
      ...(!isAdmin && business?.id ? { campaign: { businessId: business.id } } : {}),
    },
    select: {
      status: true,
      errorCode: true,
      errorMessage: true,
      phone: true,
      deliveredAt: true,
      readAt: true,
      sentAt: true,
    },
  });

  if (dbLog) {
    return NextResponse.json({
      found: true,
      source: "database",
      status: dbLog.status.toLowerCase(),
      errorCode: dbLog.errorCode,
      errorMessage: dbLog.errorMessage,
      recipientId: dbLog.phone,
      deliveredAt: dbLog.deliveredAt,
      readAt: dbLog.readAt,
      sentAt: dbLog.sentAt,
    });
  }

  return NextResponse.json({
    found: false,
    status: "pending_meta",
    message: "Awaiting delivery confirmation from Meta WhatsApp network...",
  });
}
