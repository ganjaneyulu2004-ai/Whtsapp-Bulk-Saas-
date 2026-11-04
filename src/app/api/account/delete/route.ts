import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { businesses: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // Safety guard: Prevent accidental deletion of primary master admin account
    if (user.role === "ADMIN" && user.username === (process.env.ADMIN_USERNAME || "ADMIN_IbrainTest")) {
      return NextResponse.json({ error: "Primary system administrator account cannot be deleted." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "REQUEST_SCHEDULED_PURGE"; // "REQUEST_SCHEDULED_PURGE" | "IMMEDIATE_PURGE"

    const confirmationCode = `DEL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const now = new Date();
    const scheduledPurgeAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Exactly 30 calendar days

    const businessIds = user.businesses.map((b) => b.id);

    // 1. Immediate Action: Disconnect and invalidate all WhatsApp access tokens immediately
    if (businessIds.length > 0) {
      await prisma.whatsAppConfig.updateMany({
        where: { businessId: { in: businessIds } },
        data: {
          isConnected: false,
          connectionMethod: "DELETED",
          waToken: null,
        },
      });
    }

    // 2. IMMEDIATE PURGE REQUEST
    if (action === "IMMEDIATE_PURGE") {
      // Clean up orphaned incoming messages for these businesses
      if (businessIds.length > 0) {
        await prisma.incomingMessage.deleteMany({
          where: { businessId: { in: businessIds } },
        });
      }

      // Record audit record before cascading deletion
      await prisma.accountDeletionAudit.create({
        data: {
          userId: user.id,
          username: user.username,
          businessName: user.businessName || user.businesses[0]?.name || null,
          userPhone: user.mobile || null,
          status: "PURGED",
          confirmationCode,
          requestedAt: now,
          scheduledPurgeAt: now,
          purgedAt: now,
        },
      });

      // Cascading deletion removes User, Business, WhatsAppConfig, Templates, Contacts, Campaigns, Logs, Subscriptions
      await prisma.user.delete({
        where: { id: user.id },
      });

      return NextResponse.json({
        success: true,
        action: "IMMEDIATE_PURGE",
        confirmationCode,
        message: "Your account and all associated WhatsApp credentials, contacts, and logs have been permanently purged.",
      });
    }

    // 3. SCHEDULED 30-DAY PURGE REQUEST (Default Meta Policy Compliance)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "DELETION_PENDING",
        deletionRequestedAt: now,
        scheduledPurgeAt: scheduledPurgeAt,
      },
    });

    await prisma.accountDeletionAudit.create({
      data: {
        userId: user.id,
        username: user.username,
        businessName: user.businessName || user.businesses[0]?.name || null,
        userPhone: user.mobile || null,
        status: "PENDING_PURGE",
        confirmationCode,
        requestedAt: now,
        scheduledPurgeAt: scheduledPurgeAt,
      },
    });

    return NextResponse.json({
      success: true,
      action: "REQUEST_SCHEDULED_PURGE",
      confirmationCode,
      scheduledPurgeAt: scheduledPurgeAt.toISOString(),
      message: "Account deletion confirmed. WhatsApp access tokens have been revoked immediately. All data will be permanently wiped within 30 days.",
    });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: err.message || "Failed to process account deletion request." }, { status: 500 });
  }
}

