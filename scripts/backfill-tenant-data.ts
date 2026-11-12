import "./load-env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgValue(flag: string): string | undefined {
  const prefix = `${flag}=`;
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(prefix));
  if (idx === -1) return undefined;
  const arg = process.argv[idx];
  if (arg.startsWith(prefix)) return arg.slice(prefix.length).trim();
  const next = process.argv[idx + 1];
  return next && !next.startsWith("--") ? next.trim() : undefined;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows: Array<{ exists: boolean }> = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    ) AS "exists";`,
    tableName,
    columnName
  );
  return Boolean(rows[0]?.exists);
}

/**
 * Safely backfills legacy NULL tenant columns BEFORE `prisma db push` / `npm run build`:
 * 1. Lists all businesses in PostgreSQL.
 * 2. Counts IncomingMessage rows with businessId IS NULL (and assigns them to --business when --apply is passed).
 * 3. Counts existing ContactTag rows, adds ContactTag.businessId BEFORE prisma db push if needed,
 *    assigns NULL rows to --business (avoiding duplicate phone conflicts), and sets @@unique([businessId, phone])
 *    so prisma db push NEVER drops any existing tags.
 * 4. Counts Template rows missing wabaId and backfills wabaId from each business's WhatsAppConfig.waBusinessAccountId.
 *
 * Defaults to DRY-RUN mode (zero writes) unless `--apply` is passed.
 *
 * Examples:
 *   npx tsx scripts/backfill-tenant-data.ts
 *   npx tsx scripts/backfill-tenant-data.ts --business "iBrainLabs"
 *   npx tsx scripts/backfill-tenant-data.ts --business "iBrainLabs" --apply
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const businessQuery = parseArgValue("--business");

  console.log("=================================================================");
  console.log(apply ? "🚀 RUNNING IN APPLY MODE (Database will be updated)" : "🔍 RUNNING IN DRY-RUN MODE (No database changes will be made)");
  console.log("=================================================================");

  // 1. Inspect all businesses
  const businesses: Array<{
    id: string;
    name: string;
    username: string;
    waPhoneNumberId: string | null;
    waBusinessAccountId: string | null;
    isConnected: boolean | null;
  }> = await prisma.$queryRawUnsafe(`
    SELECT
      b."id",
      b."name",
      u."username",
      wc."waPhoneNumberId",
      wc."waBusinessAccountId",
      wc."isConnected"
    FROM "Business" b
    JOIN "User" u ON u."id" = b."userId"
    LEFT JOIN "WhatsAppConfig" wc ON wc."businessId" = b."id"
    ORDER BY b."createdAt" ASC;
  `);

  console.log(`\n📋 Businesses in database (${businesses.length}):`);
  for (const b of businesses) {
    console.log(
      `  • "${b.name}" (id=${b.id}, user=${b.username}, phoneId=${b.waPhoneNumberId || "NULL"}, wabaId=${b.waBusinessAccountId || "NULL"}, connected=${Boolean(b.isConnected)})`
    );
  }

  let targetBusiness: (typeof businesses)[number] | undefined;
  if (businessQuery) {
    const q = businessQuery.toLowerCase();
    const exact = businesses.filter((b) => b.name.toLowerCase() === q);
    const partial = businesses.filter((b) => b.name.toLowerCase().includes(q));
    const matches = exact.length === 1 ? exact : partial;

    if (matches.length === 0) {
      console.error(`\n❌ No business matched --business "${businessQuery}". Copy an exact name from the list above.`);
      process.exit(1);
    }
    if (matches.length > 1) {
      console.error(`\n❌ Multiple businesses matched "${businessQuery}": ${matches.map((m) => `"${m.name}"`).join(", ")}. Pass the exact business name.`);
      process.exit(1);
    }
    targetBusiness = matches[0];
    console.log(`\n🎯 Selected target business: "${targetBusiness.name}" (${targetBusiness.id})`);
  } else {
    console.log(`\nℹ️ No --business filter passed. Pass --business "<Exact Business Name>" to target NULL rows.`);
  }

  // 2. IncomingMessage with businessId IS NULL
  const nullIncomingStats: Array<{ total_null: number; distinct_phones: number }> = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int AS total_null,
      COUNT(DISTINCT "fromPhone")::int AS distinct_phones
    FROM "IncomingMessage"
    WHERE "businessId" IS NULL;
  `);

  const incomingBreakdown: Array<{ business_id: string | null; cnt: number }> = await prisma.$queryRawUnsafe(`
    SELECT "businessId" AS business_id, COUNT(*)::int AS cnt
    FROM "IncomingMessage"
    GROUP BY "businessId"
    ORDER BY cnt DESC;
  `);

  const nullIncomingCount = nullIncomingStats[0]?.total_null || 0;
  console.log("\n--- 1) IncomingMessage Audit ---");
  for (const row of incomingBreakdown) {
    const label = row.business_id
      ? businesses.find((b) => b.id === row.business_id)?.name || row.business_id
      : "NULL (unassigned)";
    console.log(`  • ${label}: ${row.cnt} row(s)`);
  }
  console.log(`  -> Total NULL IncomingMessage rows: ${nullIncomingCount} (across ${nullIncomingStats[0]?.distinct_phones || 0} distinct phone(s))`);

  if (nullIncomingCount > 0 && targetBusiness) {
    if (apply) {
      const updatedIncoming = await prisma.$executeRawUnsafe(
        `UPDATE "IncomingMessage" SET "businessId" = $1 WHERE "businessId" IS NULL;`,
        targetBusiness.id
      );
      console.log(`  ✅ [APPLIED] Assigned ${updatedIncoming} NULL IncomingMessage row(s) to "${targetBusiness.name}".`);
    } else {
      console.log(`  🔍 [DRY-RUN] Would assign ${nullIncomingCount} NULL IncomingMessage row(s) to "${targetBusiness.name}".`);
    }
  } else if (apply && nullIncomingCount > 0 && !targetBusiness) {
    console.error(`  ❌ Cannot apply IncomingMessage backfill without --business "<Business Name>".`);
    process.exit(1);
  }

  // 3. ContactTag backfill BEFORE prisma db push adds @@unique([businessId, phone])
  const hasContactTagBusinessCol = await columnExists("ContactTag", "businessId");
  console.log("\n--- 2) ContactTag Audit ---");
  console.log(`  • Column ContactTag.businessId exists: ${hasContactTagBusinessCol}`);

  const totalTagsRes: Array<{ cnt: number }> = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM "ContactTag";`);
  const totalTagsCount = totalTagsRes[0]?.cnt || 0;

  let nullTagCount = totalTagsCount;
  if (hasContactTagBusinessCol) {
    const nullTagRes: Array<{ cnt: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS cnt FROM "ContactTag" WHERE "businessId" IS NULL;`
    );
    nullTagCount = nullTagRes[0]?.cnt || 0;
  }

  console.log(`  • Total ContactTag rows: ${totalTagsCount} | Rows needing businessId backfill: ${nullTagCount}`);

  if (apply) {
    if (nullTagCount > 0 && !targetBusiness) {
      console.error(`  ❌ Cannot backfill ${nullTagCount} ContactTag row(s) without --business "<Business Name>".`);
      process.exit(1);
    }

    // Add column & safely migrate unique constraint BEFORE prisma db push
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContactTag" ADD COLUMN IF NOT EXISTS "businessId" TEXT;`);

    if (nullTagCount > 0 && targetBusiness) {
      // Remove any NULL row only if targetBusiness already has a tag for the exact same phone (prevents unique key violation)
      const dupRemoved = await prisma.$executeRawUnsafe(
        `DELETE FROM "ContactTag" c_null
         WHERE c_null."businessId" IS NULL
           AND EXISTS (
             SELECT 1 FROM "ContactTag" c_own
             WHERE c_own."businessId" = $1 AND c_own."phone" = c_null."phone"
           );`,
        targetBusiness.id
      );

      const updatedTags = await prisma.$executeRawUnsafe(
        `UPDATE "ContactTag" SET "businessId" = $1 WHERE "businessId" IS NULL;`,
        targetBusiness.id
      );

      console.log(
        `  ✅ [APPLIED] Backfilled ${updatedTags} ContactTag row(s) to "${targetBusiness.name}"` +
          (dupRemoved > 0 ? ` (skipped ${dupRemoved} duplicate phone row(s) already tagged under target business).` : ".")
      );
    }

    await prisma.$executeRawUnsafe(`ALTER TABLE "ContactTag" DROP CONSTRAINT IF EXISTS "ContactTag_phone_key";`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "ContactTag_phone_key";`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ContactTag_businessId_phone_key" ON "ContactTag"("businessId", "phone");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ContactTag_businessId_idx" ON "ContactTag"("businessId");`);
    console.log(`  ✅ [APPLIED] ContactTag unique index ("businessId", "phone") is ready for prisma db push.`);
  } else {
    if (nullTagCount > 0 && targetBusiness) {
      console.log(`  🔍 [DRY-RUN] Would backfill ${nullTagCount} ContactTag row(s) to "${targetBusiness.name}" and convert unique constraint to (businessId, phone).`);
    } else if (nullTagCount > 0) {
      console.log(`  🔍 [DRY-RUN] ${nullTagCount} ContactTag row(s) need --business "<Business Name>" before applying.`);
    } else {
      console.log(`  ✅ No ContactTag rows need businessId backfill.`);
    }
  }

  // 4. Template.wabaId backfill from WhatsAppConfig.waBusinessAccountId
  const hasTemplateWabaCol = await columnExists("Template", "wabaId");
  console.log("\n--- 3) Template WABA Backfill Audit ---");
  console.log(`  • Column Template.wabaId exists: ${hasTemplateWabaCol}`);

  const tplWhere = hasTemplateWabaCol ? `t."wabaId" IS NULL` : `TRUE`;
  const templateAudit: Array<{
    business_id: string;
    business_name: string;
    waba_id: string | null;
    tpl_count: number;
  }> = await prisma.$queryRawUnsafe(`
    SELECT
      t."businessId" AS business_id,
      b."name" AS business_name,
      wc."waBusinessAccountId" AS waba_id,
      COUNT(*)::int AS tpl_count
    FROM "Template" t
    JOIN "Business" b ON b."id" = t."businessId"
    LEFT JOIN "WhatsAppConfig" wc ON wc."businessId" = t."businessId"
    WHERE ${tplWhere}
    GROUP BY t."businessId", b."name", wc."waBusinessAccountId"
    ORDER BY tpl_count DESC;
  `);

  let totalTemplatesBackfillable = 0;
  let totalTemplatesMissingWaba = 0;

  for (const row of templateAudit) {
    if (row.waba_id && row.waba_id.trim() !== "") {
      totalTemplatesBackfillable += row.tpl_count;
      console.log(`  • "${row.business_name}": ${row.tpl_count} template(s) -> wabaId="${row.waba_id}"`);
    } else {
      totalTemplatesMissingWaba += row.tpl_count;
      console.log(`  ⚠️ "${row.business_name}": ${row.tpl_count} template(s) -> business has NO waBusinessAccountId (remains NULL / hidden until connected)`);
    }
  }

  if (templateAudit.length === 0) {
    console.log(`  ✅ All existing Template rows already have wabaId populated.`);
  }

  if (apply) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "wabaId" TEXT;`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Template_businessId_wabaId_idx" ON "Template"("businessId", "wabaId");`);

    const updatedTemplates = await prisma.$executeRawUnsafe(`
      UPDATE "Template" t
      SET "wabaId" = wc."waBusinessAccountId"
      FROM "WhatsAppConfig" wc
      WHERE t."businessId" = wc."businessId"
        AND t."wabaId" IS NULL
        AND wc."waBusinessAccountId" IS NOT NULL
        AND wc."waBusinessAccountId" <> '';
    `);
    console.log(`  ✅ [APPLIED] Backfilled wabaId on ${updatedTemplates} Template row(s) from WhatsAppConfig.waBusinessAccountId.`);
  } else {
    console.log(
      `  🔍 [DRY-RUN] Would backfill wabaId on ${totalTemplatesBackfillable} Template row(s)` +
        (totalTemplatesMissingWaba > 0 ? ` (${totalTemplatesMissingWaba} skipped without WABA).` : ".")
    );
  }

  console.log("\n=================================================================");
  console.log(apply ? "✅ Tenant backfill APPLY complete." : "ℹ️ Dry-run complete. Add --apply with --business \"<name>\" to apply changes.");
  console.log("=================================================================");
}

main()
  .catch((err) => {
    console.error("❌ Backfill script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

