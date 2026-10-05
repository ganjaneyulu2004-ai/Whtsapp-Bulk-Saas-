import { NextResponse } from "next/server";
import { getMessageDeliveryStatus } from "@/lib/webhook-state";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wamid = searchParams.get("wamid");

  if (!wamid) {
    return NextResponse.json({ error: "wamid query parameter is required" }, { status: 400 });
  }

  // 1. Check in-memory fast webhook state
  const memStatus = getMessageDeliveryStatus(wamid);
  if (memStatus) {
    return NextResponse.json({
      found: true,
      source: "live_webhook",
      status: memStatus.status,
      errorCode: memStatus.errorCode,
      errorMessage: memStatus.errorMessage,
      recipientId: memStatus.recipientId,
      timestamp: memStatus.timestamp,
    });
  }

  // 2. Fallback to database MessageLog
  const dbLog = await prisma.messageLog.findUnique({
    where: { waMessageId: wamid },
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
