import { prisma } from "./prisma";
import { SUBSCRIPTION_PLANS, CREDIT_TOPUP_PACKS } from "@/config/plans";

export interface UserUsageQuota {
  isAdmin: boolean;
  isExempt: boolean;
  planName: string;
  planLimit: number;
  messagesSentInCycle: number;
  planRemaining: number;
  totalTopUpCredits: number;
  topUpRemaining: number;
  totalAvailable: number;
  isLimitReached: boolean;
  alertMessage: string;
  alertMessageTe: string;
  cycleStartDate: Date;
  cycleEndDate: Date | null;
}

export async function getUserMessageUsage(userId: string): Promise<UserUsageQuota> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, username: true },
  });

  const alertMessage = "Your monthly plan message limit has been reached. Please top-up to continue broadcasting.";
  const alertMessageTe = "⚠️ మీ ప్లాన్ లోని మెసేజ్ లిమిట్ పూర్తయింది. మిగిలిన మెసేజ్‌లు వెళ్లడానికి దయచేసి రీఛార్జ్ / టాప్-అప్ చేసుకోండి.";

  if (!user) {
    return {
      isAdmin: false,
      isExempt: false,
      planName: "None",
      planLimit: 0,
      messagesSentInCycle: 0,
      planRemaining: 0,
      totalTopUpCredits: 0,
      topUpRemaining: 0,
      totalAvailable: 0,
      isLimitReached: true,
      alertMessage,
      alertMessageTe,
      cycleStartDate: new Date(),
      cycleEndDate: null,
    };
  }

  // Super Admin is permanently unlimited
  if (user.role === "ADMIN") {
    return {
      isAdmin: true,
      isExempt: true,
      planName: "Enterprise Lifetime Unlimited",
      planLimit: 9999999,
      messagesSentInCycle: 0,
      planRemaining: 9999999,
      totalTopUpCredits: 9999999,
      topUpRemaining: 9999999,
      totalAvailable: 9999999,
      isLimitReached: false,
      alertMessage,
      alertMessageTe,
      cycleStartDate: new Date(),
      cycleEndDate: null,
    };
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  // Separate monthly base plans from top-up packs
  const topUpSubs = subscriptions.filter(
    (s) =>
      s.plan.toLowerCase().includes("topup") ||
      s.plan.toLowerCase().includes("top-up") ||
      s.plan.toLowerCase().includes("booster") ||
      s.plan.toLowerCase().includes("credit") ||
      (s.adminNote && s.adminNote.startsWith("TOPUP:"))
  );

  const baseSub = subscriptions.find(
    (s) =>
      !s.plan.toLowerCase().includes("topup") &&
      !s.plan.toLowerCase().includes("top-up") &&
      !s.plan.toLowerCase().includes("booster") &&
      !s.plan.toLowerCase().includes("credit") &&
      !(s.adminNote && s.adminNote.startsWith("TOPUP:"))
  );

  let planName = baseSub?.plan || "Starter";
  let planLimit = 2000;

  // Determine plan limit
  const matchedPlan = SUBSCRIPTION_PLANS.find(
    (p) => p.name.toLowerCase() === planName.toLowerCase() || p.id.toLowerCase() === planName.toLowerCase()
  );

  if (matchedPlan) {
    planLimit = matchedPlan.messages;
  } else if (planName.toLowerCase().includes("vip")) {
    planLimit = 100000; // VIP account has high allowance
  }

  const now = new Date();
  const cycleStartDate = baseSub?.startDate || baseSub?.createdAt || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const cycleEndDate = baseSub?.endDate || null;

  // Calculate total top-up credits purchased
  let totalTopUpCredits = 0;
  for (const tSub of topUpSubs) {
    if (tSub.adminNote && tSub.adminNote.startsWith("TOPUP:")) {
      const match = tSub.adminNote.match(/TOPUP:(\d+)/);
      if (match && match[1]) {
        totalTopUpCredits += parseInt(match[1], 10);
        continue;
      }
    }
    const matchedPack = CREDIT_TOPUP_PACKS.find(
      (pack) =>
        pack.name.toLowerCase() === tSub.plan.toLowerCase() ||
        pack.id.toLowerCase() === tSub.plan.toLowerCase()
    );
    if (matchedPack) {
      totalTopUpCredits += matchedPack.credits;
    } else {
      totalTopUpCredits += 1000; // Default fallback
    }
  }

  // Count messages sent in current cycle
  const businesses = await prisma.business.findMany({
    where: { userId },
    select: { id: true },
  });
  const businessIds = businesses.map((b) => b.id);

  let messagesSentInCycle = 0;
  if (businessIds.length > 0) {
    messagesSentInCycle = await prisma.messageLog.count({
      where: {
        campaign: { businessId: { in: businessIds } },
        status: { in: ["SENT", "DELIVERED", "READ"] },
        sentAt: { gte: cycleStartDate },
      },
    });
  }

  const planRemaining = Math.max(0, planLimit - messagesSentInCycle);
  const planOverage = Math.max(0, messagesSentInCycle - planLimit);
  const topUpRemaining = Math.max(0, totalTopUpCredits - planOverage);
  const totalAvailable = planRemaining + topUpRemaining;
  const isLimitReached = totalAvailable <= 0;

  return {
    isAdmin: false,
    isExempt: false,
    planName,
    planLimit,
    messagesSentInCycle,
    planRemaining,
    totalTopUpCredits,
    topUpRemaining,
    totalAvailable,
    isLimitReached,
    alertMessage,
    alertMessageTe,
    cycleStartDate,
    cycleEndDate,
  };
}
