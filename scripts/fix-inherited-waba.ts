import "./load-env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Multi-tenant data cleanup script:
 * 1. Finds WhatsAppConfig rows where isConnected=false and waPhoneNumberId IS NULL
 *    (or empty), yet waBusinessAccountId matches another business's connected WABA
 *    (e.g., an unconnected client holding Admin's WABA ID 2367270804076581),
 *    and clears waBusinessAccountId = NULL.
 * 2. Finds Template rows whose wabaId does not match their own business's connected WABA
 *    (or belong to a business with no connected WABA), prints them in dry-run, and
 *    removes them when `--apply` is passed (skipping any referenced by historical campaigns).
 *
 * Usage:
 *   npx tsx scripts/fix-inherited-waba.ts          (dry-run)
 *   npx tsx scripts/fix-inherited-waba.ts --apply  (apply updates & deletions)
 */
async function main() {
  const apply = process.argv.includes("--apply");

  console.log("=================================================================");
  console.log(
    apply
      ? "🚀 FIX-INHERITED-WABA: APPLY MODE (Database will be updated)"
      : "🔍 FIX-INHERITED-WABA: DRY-RUN MODE (Zero changes will be made)"
  );
  console.log("=================================================================");

  const configs = await prisma.whatsAppConfig.findMany({
    include: {
      business: {
        include: {
          user: {
            select: { username: true, role: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Identify WABAs actively owned by businesses that actually have a waPhoneNumberId
  const wabaOwners = new Map<string, Array<{ businessId: string; businessName: string; role: string }>>();
  for (const cfg of configs) {
    const waba = cfg.waBusinessAccountId?.trim();
    if (!waba) continue;
    const hasOwnNumber = Boolean(cfg.waPhoneNumberId && cfg.waPhoneNumberId.trim() !== "");
    if (cfg.isConnected || hasOwnNumber || cfg.business.user.role === "ADMIN") {
      const list = wabaOwners.get(waba) || [];
      list.push({
        businessId: cfg.businessId,
        businessName: cfg.business.name,
        role: cfg.business.user.role,
      });
      wabaOwners.set(waba, list);
    }
  }

  // 1. Check inherited WABAs: skip ANY business whose WhatsAppConfig is connected (isConnected=true or waPhoneNumberId set)
  const skippedConnectedConfigs = configs.filter((cfg) => {
    const hasPhoneId = Boolean(cfg.waPhoneNumberId && cfg.waPhoneNumberId.trim() !== "");
    return cfg.isConnected || hasPhoneId;
  });

  const inheritedConfigs = configs.filter((cfg) => {
    const waba = cfg.waBusinessAccountId?.trim();
    const hasPhoneId = Boolean(cfg.waPhoneNumberId && cfg.waPhoneNumberId.trim() !== "");
    if (cfg.isConnected || hasPhoneId || !waba) return false;
    const owners = (wabaOwners.get(waba) || []).filter((o) => o.businessId !== cfg.businessId);
    return owners.length > 0;
  });

  console.log(`\n--- 1) Inherited WABA Check (skips connected / phone-assigned businesses) ---`);
  for (const cfg of skippedConnectedConfigs) {
    console.log(
      `  ⏭️ [SKIPPED CONNECTED] "${cfg.business.name}" (isConnected=${cfg.isConnected}, waPhoneNumberId=${cfg.waPhoneNumberId || "NULL"}, waBusinessAccountId=${cfg.waBusinessAccountId || "NULL"})`
    );
  }
  if (inheritedConfigs.length === 0) {
    console.log("  ✅ No unconnected WhatsAppConfig rows are holding another business's WABA.");
  } else {
    for (const cfg of inheritedConfigs) {
      const waba = cfg.waBusinessAccountId!.trim();
      const owners = (wabaOwners.get(waba) || [])
        .filter((o) => o.businessId !== cfg.businessId)
        .map((o) => `"${o.businessName}" (${o.role})`)
        .join(", ");
      console.log(
        `  • "${cfg.business.name}" (user=${cfg.business.user.username}, configId=${cfg.id}) holds WABA=${waba} belonging to ${owners}`
      );
    }

    if (apply) {
      const res = await prisma.whatsAppConfig.updateMany({
        where: { id: { in: inheritedConfigs.map((c) => c.id) } },
        data: { waBusinessAccountId: null },
      });
      console.log(`  ✅ [APPLIED] Set waBusinessAccountId=NULL on ${res.count} inherited WhatsAppConfig row(s).`);
    } else {
      console.log(`  🔍 [DRY-RUN] Would set waBusinessAccountId=NULL on ${inheritedConfigs.length} WhatsAppConfig row(s).`);
    }
  }

  // Effective WABA per business AFTER clearing inherited unconnected WABAs
  const effectiveWabaByBusiness = new Map<string, string | null>();
  const clearedIds = new Set(inheritedConfigs.map((c) => c.id));
  for (const cfg of configs) {
    if (clearedIds.has(cfg.id)) {
      effectiveWabaByBusiness.set(cfg.businessId, null);
    } else {
      effectiveWabaByBusiness.set(cfg.businessId, cfg.waBusinessAccountId?.trim() || null);
    }
  }

  // 2. Check Template rows whose wabaId does not match their business's own connected WABA
  const allTemplates = await prisma.template.findMany({
    include: {
      business: { select: { name: true } },
      _count: { select: { campaigns: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const connectedBusinessIds = new Set(skippedConnectedConfigs.map((c) => c.businessId));

  const mismatchedTemplates = allTemplates.filter((tpl) => {
    // Skip any business whose WhatsAppConfig is connected (isConnected=true or waPhoneNumberId set)
    if (connectedBusinessIds.has(tpl.businessId)) return false;
    const bizWaba = effectiveWabaByBusiness.get(tpl.businessId) || null;
    const tplWaba = tpl.wabaId?.trim() || null;
    if (!bizWaba) return true; // Unconnected business cannot own valid WABA templates
    return tplWaba !== bizWaba;
  });

  console.log(`\n--- 2) Mismatched Template Rows Check (total templates inspected: ${allTemplates.length}) ---`);
  if (mismatchedTemplates.length === 0) {
    console.log("  ✅ All Template rows match their own business's connected WABA.");
  } else {
    for (const tpl of mismatchedTemplates) {
      const bizWaba = effectiveWabaByBusiness.get(tpl.businessId) || "NULL (unconnected)";
      console.log(
        `  • [${tpl.id}] Business="${tpl.business.name}" | Template="${tpl.name}" (${tpl.language}, status=${tpl.status}) | tpl.wabaId="${tpl.wabaId || "NULL"}" vs ownWaba="${bizWaba}" | campaigns=${tpl._count.campaigns}`
      );
    }

    if (apply) {
      const deletableIds = mismatchedTemplates.filter((t) => t._count.campaigns === 0).map((t) => t.id);
      const blockedCount = mismatchedTemplates.length - deletableIds.length;

      let deletedCount = 0;
      if (deletableIds.length > 0) {
        const del = await prisma.template.deleteMany({
          where: { id: { in: deletableIds } },
        });
        deletedCount = del.count;
      }

      console.log(`  ✅ [APPLIED] Removed ${deletedCount} mismatched Template row(s).`);
      if (blockedCount > 0) {
        console.warn(
          `  ⚠️ Kept ${blockedCount} mismatched Template row(s) referenced by existing Campaign history (safe FK preservation). Run 'ARCHIVED' status update on those instead.`
        );
        await prisma.template.updateMany({
          where: {
            id: {
              in: mismatchedTemplates.filter((t) => t._count.campaigns > 0).map((t) => t.id),
            },
          },
          data: { status: "NOT_IN_WABA" },
        });
      }
    } else {
      console.log(`  🔍 [DRY-RUN] Found ${mismatchedTemplates.length} mismatched Template row(s) to remove (or archive if used in past campaigns).`);
    }
  }

  console.log("\n=================================================================");
  console.log(apply ? "✅ Cleanup APPLY finished." : "ℹ️ Dry-run complete. Run with --apply to commit changes.");
  console.log("=================================================================");
}

main()
  .catch((err) => {
    console.error("❌ Script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

