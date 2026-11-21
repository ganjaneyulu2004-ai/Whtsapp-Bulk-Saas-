import "./load-env";
import { PrismaClient } from "@prisma/client";
import { decryptToken } from "../src/lib/encryption";
import { fetchWabaOwnerInfo } from "../src/lib/whatsapp";

const prisma = new PrismaClient();

async function main() {
  const isApply = process.argv.includes("--apply");
  const isDryRun = !isApply || process.argv.includes("--dry-run");

  console.log(`\n============================================================`);
  console.log(`🚀 Meta WABA Owner Business ID Backfill`);
  console.log(`Mode: ${isApply ? "APPLY (committing changes to database)" : "DRY-RUN (read-only inspection)"}`);
  console.log(`============================================================\n`);

  const configs = await prisma.whatsAppConfig.findMany({
    include: {
      business: {
        select: { id: true, name: true, ownerBusinessId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Found ${configs.length} WhatsAppConfig record(s) in database.\n`);

  let countProcessed = 0;
  let countUpdated = 0;
  let countSkipped = 0;
  let countFailed = 0;

  for (const cfg of configs) {
    const bizName = cfg.business?.name || "Unknown Business";
    const wabaId = cfg.waBusinessAccountId?.trim();

    if (!wabaId) {
      console.log(`⏩ [SKIP] ${bizName} (No WABA ID configured)`);
      countSkipped++;
      continue;
    }

    countProcessed++;
    const plainToken = decryptToken(cfg.waToken);

    if (!plainToken) {
      console.warn(`⚠️ [WARN] ${bizName} (WABA: ${wabaId}): Missing or un-decryptable access token`);
      countSkipped++;
      continue;
    }

    try {
      console.log(`🔍 Inspecting Meta for: ${bizName} (WABA: ${wabaId})...`);
      const metaInfo = await fetchWabaOwnerInfo(wabaId, plainToken);

      const ownerId = metaInfo.ownerBusinessId;
      const ownerName = metaInfo.ownerBusinessName;
      const wabaName = metaInfo.wabaName;

      console.log(`   • WABA Name: "${wabaName || "N/A"}"`);
      console.log(`   • Owner Business ID: "${ownerId || "N/A"}"`);
      console.log(`   • Owner Business Name: "${ownerName || "N/A"}"`);
      console.log(`   • Current DB ownerBusinessId: "${cfg.ownerBusinessId || "NULL"}"`);

      if (!ownerId && !wabaName) {
        console.warn(`   ⚠️ Meta did not return owner info for WABA ${wabaId}`);
        countFailed++;
        continue;
      }

      if (isApply) {
        await prisma.whatsAppConfig.update({
          where: { id: cfg.id },
          data: {
            ownerBusinessId: ownerId || cfg.ownerBusinessId,
            ownerBusinessName: ownerName || cfg.ownerBusinessName,
            wabaName: wabaName || cfg.wabaName,
          },
        });

        if (ownerId && cfg.business?.id) {
          await prisma.business.update({
            where: { id: cfg.business.id },
            data: { ownerBusinessId: ownerId },
          });
        }

        console.log(`   ✅ [APPLIED] Updated database record for ${bizName}\n`);
        countUpdated++;
      } else {
        console.log(`   ℹ️ [DRY-RUN] Would update ${bizName} with ownerBusinessId="${ownerId}", wabaName="${wabaName}"\n`);
        countUpdated++;
      }
    } catch (err: any) {
      console.error(`   ❌ [ERROR] Failed to query Meta for ${bizName}:`, err?.message || err, "\n");
      countFailed++;
    }
  }

  console.log(`============================================================`);
  console.log(`📊 Summary:`);
  console.log(`   • Total Processed: ${countProcessed}`);
  console.log(`   • ${isApply ? "Updated" : "Would Update"}: ${countUpdated}`);
  console.log(`   • Skipped: ${countSkipped}`);
  console.log(`   • Errors: ${countFailed}`);
  if (isDryRun && !isApply) {
    console.log(`\n💡 To commit these changes to your database, run:`);
    console.log(`   npx tsx scripts/backfill-waba-owner.ts --apply`);
  }
  console.log(`============================================================\n`);
}

main()
  .catch((e) => {
    console.error("Backfill script fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

