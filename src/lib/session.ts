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

          await prisma.whatsAppConfig.create({
            data: {
              businessId: userBiz.id,
              waApiVersion: "v26.0",
              messagingLimitTier: "TIER_250",
              isConnected: false,
            },
          });
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
