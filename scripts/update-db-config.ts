import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function updateDbConfig() {
  const business = await prisma.business.findFirst();
  if (business) {
    await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waBusinessAccountId: "1769046204220658",
        waToken: process.env.WA_TOKEN,
        isConnected: true,
      },
      create: {
        businessId: business.id,
        waBusinessAccountId: "1769046204220658",
        waToken: process.env.WA_TOKEN,
        isConnected: true,
      },
    });
    console.log("✅ Updated database WhatsAppConfig with real WABA ID!");
  }
}
updateDbConfig().finally(() => prisma.$disconnect());
