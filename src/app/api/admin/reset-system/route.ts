import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    console.log("🧹 Starting full system cleanup: wiping all old test data...");

    // 1. Delete all message logs and incoming messages
    await prisma.messageLog.deleteMany({});
    await prisma.incomingMessage.deleteMany({});

    // 2. Delete all campaigns
    await prisma.campaign.deleteMany({});

    // 3. Delete all contacts & contact lists
    await prisma.contact.deleteMany({});
    await prisma.contactList.deleteMany({});

    // 4. Delete all non-admin subscriptions
    await prisma.subscription.deleteMany({
      where: {
        user: {
          role: { not: "ADMIN" },
        },
      },
    });

    // 5. Delete all non-admin templates
    await prisma.template.deleteMany({
      where: {
        business: {
          user: {
            role: { not: "ADMIN" },
          },
        },
      },
    });

    // 6. Delete all non-admin WhatsApp configs
    await prisma.whatsAppConfig.deleteMany({
      where: {
        business: {
          user: {
            role: { not: "ADMIN" },
          },
        },
      },
    });

    // 7. Delete all non-admin businesses
    await prisma.business.deleteMany({
      where: {
        user: {
          role: { not: "ADMIN" },
        },
      },
    });

    // 8. Delete all non-admin users (e.g. test accounts like Royal Bikes, Anji@1233, etc.)
    await prisma.user.deleteMany({
      where: {
        role: { not: "ADMIN" },
      },
    });

    // 9. Ensure / Reset Master Admin account
    const adminUsername = process.env.ADMIN_USERNAME || "ADMIN_IbrainTest";
    const adminPassword = process.env.ADMIN_PASSWORD || "ADMIN_IbrainTest123";
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const masterAdmin = await prisma.user.upsert({
      where: { username: adminUsername },
      update: {
        passwordHash: adminPasswordHash,
        name: "iBrainLabs Admin",
        businessName: "iBrainLabs",
        role: "ADMIN",
        mobile: process.env.ADMIN_NOTIFY_PHONE || "9390487233",
      },
      create: {
        username: adminUsername,
        passwordHash: adminPasswordHash,
        name: "iBrainLabs Admin",
        businessName: "iBrainLabs",
        role: "ADMIN",
        mobile: process.env.ADMIN_NOTIFY_PHONE || "9390487233",
      },
    });

    // 10. Ensure / Reset Master Business
    const masterBusiness = await prisma.business.upsert({
      where: { id: "demo-business-id" },
      update: {
        name: "iBrainLabs",
        userId: masterAdmin.id,
        category: "WhatsApp Bulk Marketing SaaS",
        phone: "+91 93904 84762",
        perMessageCost: 0.80,
        language: "en",
      },
      create: {
        id: "demo-business-id",
        name: "iBrainLabs",
        userId: masterAdmin.id,
        category: "WhatsApp Bulk Marketing SaaS",
        phone: "+91 93904 84762",
        perMessageCost: 0.80,
        language: "en",
      },
    });

    // 11. Ensure / Reset Master WhatsApp Config
    const waToken = process.env.WA_TOKEN || null;
    const waPhoneId = process.env.WA_PHONE_NUMBER_ID || "1443849605471143";
    const waAccountId = process.env.WA_BUSINESS_ACCOUNT_ID || "2367270804076581";

    await prisma.whatsAppConfig.upsert({
      where: { businessId: masterBusiness.id },
      update: {
        waToken,
        waPhoneNumberId: waPhoneId,
        waBusinessAccountId: waAccountId,
        waApiVersion: "v20.0",
        messagingLimitTier: "TIER_250",
        isConnected: true,
        connectionMethod: "OFFICIAL_OFFICE_API",
        displayPhoneNumber: "+91 96426 83699",
        verifiedName: "iBrainLabs Official",
        qualityRating: "High (Green)",
      },
      create: {
        businessId: masterBusiness.id,
        waToken,
        waPhoneNumberId: waPhoneId,
        waBusinessAccountId: waAccountId,
        waApiVersion: "v20.0",
        messagingLimitTier: "TIER_250",
        isConnected: true,
        connectionMethod: "OFFICIAL_OFFICE_API",
        displayPhoneNumber: "+91 96426 83699",
        verifiedName: "iBrainLabs Official",
        qualityRating: "High (Green)",
      },
    });

    // 12. Ensure / Reset Master Subscription (Lifetime Active)
    const existingAdminSub = await prisma.subscription.findFirst({
      where: { userId: masterAdmin.id },
    });

    const now = new Date();
    const tenYearsLater = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

    if (existingAdminSub) {
      await prisma.subscription.update({
        where: { id: existingAdminSub.id },
        data: {
          plan: "Super Admin Master Lifetime",
          amount: 0,
          status: "ACTIVE",
          startDate: now,
          endDate: tenYearsLater,
          approvedAt: now,
          adminNote: "Master Administrator System Access",
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: masterAdmin.id,
          plan: "Super Admin Master Lifetime",
          amount: 0,
          status: "ACTIVE",
          startDate: now,
          endDate: tenYearsLater,
          approvedAt: now,
          adminNote: "Master Administrator System Access",
        },
      });
    }

    console.log("✅ Full system cleanup complete: Clean starting state established.");

    return NextResponse.json({
      success: true,
      message: "System has been completely reset to a clean starting state! All old test campaigns, contacts, and client accounts have been wiped.",
    });
  } catch (err: any) {
    console.error("Reset system error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to reset system." },
      { status: 500 }
    );
  }
}
