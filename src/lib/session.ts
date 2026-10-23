import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentBusiness() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      if (session.user.role === "ADMIN") {
        // Admin gets the primary business or demo business
        const primary = await prisma.business.findFirst({
          include: { whatsappConfig: true },
        });
        if (primary) return primary;
      } else {
        // Regular user gets their own business
        let userBiz = await prisma.business.findFirst({
          where: { userId: session.user.id },
          include: { whatsappConfig: true },
        });

        if (!userBiz) {
          userBiz = await prisma.business.create({
            data: {
              userId: session.user.id,
              name: session.user.businessName || `${session.user.name}'s Business`,
              category: "Retail & Business",
              language: "en",
            },
            include: { whatsappConfig: true },
          });
        }

        if (!userBiz.whatsappConfig || !userBiz.whatsappConfig.isConnected) {
          const config = await prisma.whatsAppConfig.upsert({
            where: { businessId: userBiz.id },
            update: {
              isConnected: true,
              displayPhoneNumber: "+91 96426 83699",
              verifiedName: "SaaS by IBrainLabs",
              qualityRating: "High (Green)",
              messagingLimitTier: "TIER_250",
              connectionMethod: "OFFICIAL_OFFICE_API",
              waPhoneNumberId: process.env.WA_PHONE_NUMBER_ID || "1443849605471143",
              waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || "2367270804076581",
              waToken: process.env.WA_TOKEN || null,
              waApiVersion: "v26.0",
            },
            create: {
              businessId: userBiz.id,
              isConnected: true,
              displayPhoneNumber: "+91 96426 83699",
              verifiedName: "SaaS by IBrainLabs",
              qualityRating: "High (Green)",
              messagingLimitTier: "TIER_250",
              connectionMethod: "OFFICIAL_OFFICE_API",
              waPhoneNumberId: process.env.WA_PHONE_NUMBER_ID || "1443849605471143",
              waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || "2367270804076581",
              waToken: process.env.WA_TOKEN || null,
              waApiVersion: "v26.0",
            },
          });
          userBiz.whatsappConfig = config;
        }
        return userBiz;
      }
    }
  } catch (e) {
    // If called outside request context, continue to fallback
  }

  // Fallback to first business in database
  let business;
  try {
    business = await prisma.business.findFirst({
      include: {
        whatsappConfig: true,
      },
    });
  } catch (dbErr: any) {
    // If table does not exist yet in cloud Postgres, auto-initialize
    if (dbErr?.message?.includes("does not exist") || dbErr?.code === "P2021") {
      const { initializeDatabase } = await import("./init-db");
      await initializeDatabase();
      business = await prisma.business.findFirst({
        include: {
          whatsappConfig: true,
        },
      });
    } else {
      throw dbErr;
    }
  }

  if (!business) {
    const user = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        name: "iBrainLabs Admin",
        passwordHash: "demo",
        role: "ADMIN",
      },
    });

    business = await prisma.business.create({
      data: {
        id: "demo-business-id",
        userId: user.id,
        name: "iBrainLabs",
        category: "Technology & Business",
      },
      include: {
        whatsappConfig: true,
      },
    });
  }

  return business;
}

export async function getCurrentUserSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}
