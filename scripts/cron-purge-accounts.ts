import fs from "fs";
import path from "path";

// Ensure .env is loaded
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

import { prisma } from "../src/lib/prisma";

export async function purgeExpiredAccounts() {
  const now = new Date();
  console.log(`[${now.toISOString()}] 🧹 Running 30-Day Automatic Data Purge Job...`);

  // Find all accounts marked for deletion whose 30-day retention has expired
  const expiredUsers = await prisma.user.findMany({
    where: {
      status: "DELETION_PENDING",
      scheduledPurgeAt: { lte: now },
    },
    include: { businesses: true },
  });

  console.log(`Found ${expiredUsers.length} account(s) past their 30-day retention period ready for permanent purge.`);

  let purgedCount = 0;

  for (const user of expiredUsers) {
    try {
      const businessIds = user.businesses.map((b) => b.id);

      // Clean up orphaned incoming messages
      if (businessIds.length > 0) {
        await prisma.incomingMessage.deleteMany({
          where: { businessId: { in: businessIds } },
        });
      }

      // Update audit record
      await prisma.accountDeletionAudit.updateMany({
        where: { userId: user.id, status: "PENDING_PURGE" },
        data: {
          status: "PURGED",
          purgedAt: now,
        },
      });

      // Cascading deletion removes User, Businesses, WhatsAppConfigs, Templates, Contacts, Campaigns, Logs
      await prisma.user.delete({
        where: { id: user.id },
      });

      purgedCount++;
      console.log(`- Permanently purged user ID: ${user.id} (${user.username}) and all cascading WhatsApp data.`);
    } catch (err: any) {
      console.error(`- Error purging user ID ${user.id}:`, err.message || err);
    }
  }

  console.log(`[${new Date().toISOString()}] ✅ Automated Purge Complete: ${purgedCount} account(s) permanently erased.`);
  return { purgedCount, totalFound: expiredUsers.length };
}

if (require.main === module) {
  purgeExpiredAccounts()
    .catch((err) => {
      console.error("Purge job failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

