import "./load-env";
import { PrismaClient } from "@prisma/client";
import { encryptToken, maskToken } from "../src/lib/encryption";

const prisma = new PrismaClient();

/**
 * Inspects all existing WhatsAppConfig rows so you can verify whether your
 * manually-onboarded client has its own waToken, waPhoneNumberId, and waBusinessAccountId.
 *
 * Pass `--fix-missing` to automatically copy & encrypt WA_TOKEN / WA_BUSINESS_ACCOUNT_ID
 * from .env into any active/manual client row where those fields are currently NULL.
 *
 * Usage:
 *   npx tsx scripts/verify-manual-clients.ts
 *   npx tsx scripts/verify-manual-clients.ts --fix-missing
 */
async function main() {
  const fixMissing = process.argv.includes("--fix-missing");

  const configs = await prisma.whatsAppConfig.findMany({
    include: {
      business: {
        include: {
          user: {
            select: { username: true, email: true, role: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`\n📋 Found ${configs.length} WhatsAppConfig row(s):\n`);

  for (const c of configs) {
    const hasToken = Boolean(c.waToken && c.waToken.trim() !== "");
    const masked = hasToken ? maskToken(c.waToken) : "MISSING (NULL)";
    console.log(
      `• Business: ${c.business.name} | User: ${c.business.user.username} (${c.business.user.role})` +
        `\n  Method: ${c.connectionMethod || "NONE"} | Connected: ${c.isConnected} | Phone: ${c.displayPhoneNumber || "N/A"}` +
        `\n  waPhoneNumberId: ${c.waPhoneNumberId || "NULL"} | waBusinessAccountId: ${c.waBusinessAccountId || "NULL"} | waToken: ${masked}\n`
    );

    const needsBackfill =
      fixMissing &&
      (c.isConnected || c.connectionMethod === "OFFICIAL_DIRECT" || c.connectionMethod === "MANUAL") &&
      c.waPhoneNumberId &&
      (!hasToken || !c.waBusinessAccountId);

    if (needsBackfill) {
      const envToken = process.env.WA_TOKEN;
      const envWabaId = process.env.WA_BUSINESS_ACCOUNT_ID;

      const updateData: Record<string, any> = {};
      if (!hasToken && envToken) {
        updateData.waToken = encryptToken(envToken);
      }
      if (!c.waBusinessAccountId && envWabaId) {
        updateData.waBusinessAccountId = envWabaId;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.whatsAppConfig.update({
          where: { id: c.id },
          data: updateData,
        });
        console.log(`  ✅ Backfilled missing credentials into ${c.business.name}'s own WhatsAppConfig row.\n`);
      } else {
        console.log(`  ⚠️ --fix-missing skipped for ${c.business.name}: WA_TOKEN or WA_BUSINESS_ACCOUNT_ID missing in .env.\n`);
      }
    }
  }
}

main()
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

