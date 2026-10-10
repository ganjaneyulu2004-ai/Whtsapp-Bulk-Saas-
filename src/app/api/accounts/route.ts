import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentBiz = await getCurrentBusiness().catch(() => null);

    // If Admin, fetch all businesses/accounts across the platform
    if (session.user.role === "ADMIN") {
      const allBusinesses = await prisma.business.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
          whatsappConfig: {
            select: {
              isConnected: true,
              displayPhoneNumber: true,
              messagingLimitTier: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const accounts = allBusinesses.map((b) => ({
        id: b.id,
        name: b.name || "Unnamed Business",
        ownerName: b.user?.name || "Admin",
        username: b.user?.username || "",
        category: b.category || "General",
        phone: b.phone || b.whatsappConfig?.displayPhoneNumber || null,
        isWaConnected: !!b.whatsappConfig?.isConnected,
        role: b.user?.role || "USER",
        isCurrent: currentBiz ? currentBiz.id === b.id : false,
      }));

      // Ensure primary default account is represented
      if (!accounts.some((a) => a.id === currentBiz?.id) && currentBiz) {
        accounts.unshift({
          id: currentBiz.id,
          name: currentBiz.name || "iBrainLabs",
          ownerName: session.user.name || "Admin",
          username: session.user.username || "",
          category: currentBiz.category || "Technology & Business",
          phone: currentBiz.phone || null,
          isWaConnected: true,
          role: "ADMIN",
          isCurrent: true,
        });
      }

      return NextResponse.json({
        currentAccountId: currentBiz?.id,
        accounts,
      });
    }

    // For regular users, return their linked businesses
    const userBusinesses = await prisma.business.findMany({
      where: { userId: session.user.id },
      include: {
        whatsappConfig: {
          select: {
            isConnected: true,
            displayPhoneNumber: true,
          },
        },
      },
    });

    const accounts = userBusinesses.map((b) => ({
      id: b.id,
      name: b.name || session.user?.businessName || "My Business",
      ownerName: session.user.name || "User",
      username: session.user.username || "",
      category: b.category || "Retail",
      phone: b.phone || b.whatsappConfig?.displayPhoneNumber || null,
      isWaConnected: !!b.whatsappConfig?.isConnected,
      role: session.user.role,
      isCurrent: currentBiz ? currentBiz.id === b.id : true,
    }));

    if (accounts.length === 0 && currentBiz) {
      accounts.push({
        id: currentBiz.id,
        name: currentBiz.name,
        ownerName: session.user.name || "User",
        username: session.user.username || "",
        category: currentBiz.category || "Retail",
        phone: currentBiz.phone,
        isWaConnected: false,
        role: session.user.role,
        isCurrent: true,
      });
    }

    return NextResponse.json({
      currentAccountId: currentBiz?.id || accounts[0]?.id,
      accounts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
