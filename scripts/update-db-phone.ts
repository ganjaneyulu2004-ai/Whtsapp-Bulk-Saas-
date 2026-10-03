import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function updateDbPhone() {
  const business = await prisma.business.findFirst();
  if (business) {
    await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waPhoneNumberId: "1182593274945416",
        waBusinessAccountId: "1769046204220658",
        waToken: process.env.WA_TOKEN,
        isConnected: true,
      },
      create: {
        businessId: business.id,
        waPhoneNumberId: "1182593274945416",
        waBusinessAccountId: "1769046204220658",
        waToken: process.env.WA_TOKEN,
        isConnected: true,
      },
    });
    console.log("✅ Updated database WhatsAppConfig with verified Phone Number ID 1182593274945416!");
  }
}

updateDbPhone().finally(() => prisma.$disconnect());
