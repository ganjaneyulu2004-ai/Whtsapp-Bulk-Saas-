import { PrismaClient } from "@prisma/client";
import { encryptToken } from "../src/lib/encryption";
const prisma = new PrismaClient();

async function updateDbPhone() {
  const business = await prisma.business.findFirst();
  if (business) {
    await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waPhoneNumberId: "1182593274945416",
        waBusinessAccountId: "1769046204220658",
        waToken: encryptToken(process.env.WA_TOKEN || null),
        isConnected: true,
      },
      create: {
        businessId: business.id,
        waPhoneNumberId: "1182593274945416",
        waBusinessAccountId: "1769046204220658",
        waToken: encryptToken(process.env.WA_TOKEN || null),
        isConnected: true,
      },
    });
    console.log("✅ Updated database WhatsAppConfig with verified Phone Number ID 1182593274945416!");
  }
}

updateDbPhone().finally(() => prisma.$disconnect());
