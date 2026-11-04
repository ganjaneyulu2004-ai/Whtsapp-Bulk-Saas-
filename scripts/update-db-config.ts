import { PrismaClient } from "@prisma/client";
import { encryptToken } from "../src/lib/encryption";
const prisma = new PrismaClient();

async function updateDbConfig() {
  const business = await prisma.business.findFirst();
  if (business) {
    await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waBusinessAccountId: "1769046204220658",
        waToken: encryptToken(process.env.WA_TOKEN || null),
        isConnected: true,
      },
      create: {
        businessId: business.id,
        waBusinessAccountId: "1769046204220658",
        waToken: encryptToken(process.env.WA_TOKEN || null),
        isConnected: true,
      },
    });
    console.log("✅ Updated database WhatsAppConfig with real WABA ID!");
  }
}
updateDbConfig().finally(() => prisma.$disconnect());
