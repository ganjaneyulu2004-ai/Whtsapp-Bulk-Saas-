import "./load-env";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/**
 * 1. Inspects PostgreSQL Business table BEFORE dropping legacy card/billing columns.
 * 2. Prints:
 *    (a) how many rows had card data
 *    (b) totalApiCharged and unbilledApiSpend per business + overall totals
 * 3. Saves the full per-business breakdown to a CSV file on the server.
 * 4. Clears all stored card data and drops the 7 legacy card/billing columns.
 *
 * Usage on VPS (run BEFORE `npm run build` / `prisma db push`):
 *   npx tsx scripts/cleanup-card-data.ts
 */
async function main() {
  console.log("🔍 Inspecting Business table for legacy card & API billing data...");

  const existingCols: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Business'
      AND column_name IN (
        'apiCardLinked',
        'apiCardLast4',
        'apiCardBrand',
        'apiCardToken',
        'unbilledApiSpend',
        'billingThreshold',
        'totalApiCharged'
      );
  `);

  const colNames = existingCols.map((c) => c.column_name);
  console.log("Found legacy columns:", colNames.length > 0 ? colNames.join(", ") : "None");

  // Dynamically build select list so query works regardless of which columns exist
  const selectParts = [`"id"`, `"name"`, `"userId"`];
  if (colNames.includes("apiCardLinked")) selectParts.push(`"apiCardLinked"`);
  if (colNames.includes("apiCardLast4")) selectParts.push(`"apiCardLast4"`);
  if (colNames.includes("apiCardBrand")) selectParts.push(`"apiCardBrand"`);
  if (colNames.includes("apiCardToken")) selectParts.push(`"apiCardToken"`);
  if (colNames.includes("unbilledApiSpend")) selectParts.push(`"unbilledApiSpend"`);
  if (colNames.includes("totalApiCharged")) selectParts.push(`"totalApiCharged"`);

  const businesses: Array<Record<string, any>> = await prisma.$queryRawUnsafe(`
    SELECT ${selectParts.join(", ")} FROM "Business" ORDER BY "createdAt" ASC;
  `);

  let cardRowCount = 0;
  let grandTotalCharged = 0;
  let grandTotalUnbilled = 0;

  const csvRows: string[] = [
    "business_id,business_name,user_id,had_card_data,api_card_linked,total_api_charged,unbilled_api_spend",
  ];

  console.log("\n📊 Per-Business Legacy Card & Spend Report (Before Drop):");
  console.log("------------------------------------------------------------------------");

  for (const b of businesses) {
    const linked = Boolean(b.apiCardLinked);
    const hasLast4 = Boolean(b.apiCardLast4 && String(b.apiCardLast4).trim() !== "");
    const hasBrand = Boolean(b.apiCardBrand && String(b.apiCardBrand).trim() !== "");
    const hasToken = Boolean(b.apiCardToken && String(b.apiCardToken).trim() !== "");
    const hadCardData = linked || hasLast4 || hasBrand || hasToken;

    if (hadCardData) cardRowCount++;

    const charged = Number(b.totalApiCharged || 0);
    const unbilled = Number(b.unbilledApiSpend || 0);
    grandTotalCharged += charged;
    grandTotalUnbilled += unbilled;

    console.log(
      `• ${b.name} (${b.id}) | cardData=${hadCardData ? "YES" : "NO"} | totalApiCharged=₹${charged.toFixed(2)} | unbilledApiSpend=₹${unbilled.toFixed(2)}`
    );

    const safeName = `"${String(b.name || "").replace(/"/g, '""')}"`;
    csvRows.push(
      `"${b.id}",${safeName},"${b.userId}",${hadCardData},${linked},${charged.toFixed(2)},${unbilled.toFixed(2)}`
    );
  }

  csvRows.push(
    `"TOTAL","All Businesses (${businesses.length})","",${cardRowCount},,${grandTotalCharged.toFixed(2)},${grandTotalUnbilled.toFixed(2)}`
  );

  console.log("------------------------------------------------------------------------");
  console.log(`(a) Rows with stored card data: ${cardRowCount} / ${businesses.length}`);
  console.log(`(b) Total totalApiCharged across all businesses: ₹${grandTotalCharged.toFixed(2)}`);
  console.log(`(b) Total unbilledApiSpend across all businesses: ₹${grandTotalUnbilled.toFixed(2)}`);

  // Save CSV archive on the server before dropping anything
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const preferredDir = "/var/backups/offerblast";
  let targetDir = process.cwd();
  try {
    fs.mkdirSync(preferredDir, { recursive: true });
    targetDir = preferredDir;
  } catch {
    const localBackupDir = path.join(process.cwd(), "backups");
    fs.mkdirSync(localBackupDir, { recursive: true });
    targetDir = localBackupDir;
  }

  const csvPath = path.join(targetDir, `card_billing_audit_${timestamp}.csv`);
  fs.writeFileSync(csvPath, csvRows.join("\n"), { encoding: "utf-8", mode: 0o600 });
  console.log(`\n💾 Saved audit CSV to: ${csvPath}`);

  // Wipe any stored card data first
  if (
    colNames.includes("apiCardLinked") ||
    colNames.includes("apiCardLast4") ||
    colNames.includes("apiCardBrand") ||
    colNames.includes("apiCardToken")
  ) {
    const sets: string[] = [];
    if (colNames.includes("apiCardLinked")) sets.push(`"apiCardLinked" = false`);
    if (colNames.includes("apiCardLast4")) sets.push(`"apiCardLast4" = NULL`);
    if (colNames.includes("apiCardBrand")) sets.push(`"apiCardBrand" = NULL`);
    if (colNames.includes("apiCardToken")) sets.push(`"apiCardToken" = NULL`);

    if (sets.length > 0 && cardRowCount > 0) {
      await prisma.$executeRawUnsafe(`UPDATE "Business" SET ${sets.join(", ")};`);
      console.log(`🧹 Cleared stored card data from ${cardRowCount} row(s).`);
    }
  }

  // Drop legacy columns cleanly
  const dropCols = [
    "apiCardLinked",
    "apiCardLast4",
    "apiCardBrand",
    "apiCardToken",
    "unbilledApiSpend",
    "billingThreshold",
    "totalApiCharged",
  ];

  for (const col of dropCols) {
    if (colNames.includes(col)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Business" DROP COLUMN IF EXISTS "${col}";`);
      console.log(`🗑️ Dropped column: ${col}`);
    }
  }

  console.log("\n✅ Legacy card inspection, CSV export, and column cleanup complete.");
}

main()
  .catch((err) => {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
