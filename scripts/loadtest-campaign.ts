import "./load-env";
import { PrismaClient } from "@prisma/client";
import { processCampaignSending } from "../src/lib/queue";

const prisma = new PrismaClient();

function getArgValue(flag: string): string | undefined {
  const prefix = `${flag}=`;
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(prefix));
  if (idx === -1) return undefined;
  const arg = process.argv[idx];
  if (arg.startsWith(prefix)) return arg.slice(prefix.length).trim();
  const next = process.argv[idx + 1];
  return next && !next.startsWith("--") ? next.trim() : undefined;
}

async function cleanupTestData(businessId?: string) {
  console.log(`\n🧹 Cleaning up ONLY isTest=true test data...`);

  const logsDeleted = await prisma.messageLog.deleteMany({
    where: {
      campaign: {
        isTest: true,
        ...(businessId ? { businessId } : {}),
      },
    },
  });

  const campaignsDeleted = await prisma.campaign.deleteMany({
    where: {
      isTest: true,
      ...(businessId ? { businessId } : {}),
    },
  });

  const contactsDeleted = await prisma.contact.deleteMany({
    where: {
      isTest: true,
      ...(businessId ? { businessId } : {}),
    },
  });

  const listsDeleted = await prisma.contactList.deleteMany({
    where: {
      name: { startsWith: "LOADTEST_" },
      ...(businessId ? { businessId } : {}),
    },
  });

  console.log(`   • Deleted ${logsDeleted.count} test message log(s)`);
  console.log(`   • Deleted ${campaignsDeleted.count} isTest campaign(s)`);
  console.log(`   • Deleted ${contactsDeleted.count} isTest contact(s)`);
  console.log(`   • Deleted ${listsDeleted.count} test contact list(s)`);
  console.log(`✅ Cleanup complete!\n`);
}

async function main() {
  const isCleanupOnly = process.argv.includes("--cleanup") && !process.argv.some((a) => a.startsWith("--count"));
  const businessArg = getArgValue("--business");
  const countArg = getArgValue("--count");
  const count = countArg ? parseInt(countArg, 10) : 100;
  const shouldCleanupAfter = process.argv.includes("--cleanup");

  if (isCleanupOnly) {
    await cleanupTestData(businessArg);
    return;
  }

  if (Number.isNaN(count) || count <= 0) {
    console.error("❌ Invalid --count argument. Please specify a positive integer, e.g. --count 1000");
    process.exit(1);
  }

  console.log(`\n============================================================`);
  console.log(`🚀 OneAmple Campaign Load-Test Runner (Dry-Run Mode)`);
  console.log(`Target: ${count} simulated messages | Safety: isTest=true (Zero Meta API calls)`);
  console.log(`============================================================\n`);

  // 1. Locate target business
  const business = businessArg
    ? await prisma.business.findUnique({
        where: { id: businessArg },
        include: { whatsappConfig: true },
      })
    : await prisma.business.findFirst({
        where: { whatsappConfig: { isConnected: true } },
        include: { whatsappConfig: true },
      }) ||
      await prisma.business.findFirst({
        include: { whatsappConfig: true },
      });

  if (!business) {
    console.error("❌ No business account found in the database. Please initialize a business first.");
    process.exit(1);
  }

  console.log(`🏢 Selected Business: "${business.name}" (${business.id})`);

  // 2. Locate or create an approved template for this business
  let template = await prisma.template.findFirst({
    where: {
      businessId: business.id,
      status: "APPROVED",
      name: { not: "hello_world" },
    },
  });

  if (!template) {
    console.log(`ℹ️ No approved template found for business. Creating mock test template...`);
    template = await prisma.template.create({
      data: {
        businessId: business.id,
        name: `loadtest_template_${Date.now()}`,
        category: "MARKETING",
        language: "en_US",
        headerType: "NONE",
        bodyText: "Hi {{1}}, this is an automated load-test message from {{2}}.",
        status: "APPROVED",
      },
    });
  }

  console.log(`📋 Selected Template: "${template.name}" (${template.id})`);

  // 3. Create test ContactList
  const listName = `LOADTEST_List_${Date.now()}`;
  const contactList = await prisma.contactList.create({
    data: {
      businessId: business.id,
      name: listName,
      description: `Temporary contact list for load test with ${count} fake recipients`,
      contactCount: count,
    },
  });

  console.log(`👥 Created test contact list: "${listName}" (${contactList.id})`);

  // 4. Batch create fake contacts (+91 90000xxxxx, isTest: true)
  console.log(`⚙️ Generating ${count} fake test contacts (+91 90000xxxxx, isTest=true)...`);
  const fakeContactsData = Array.from({ length: count }, (_, i) => ({
    id: `test_contact_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
    businessId: business.id,
    listId: contactList.id,
    name: `LoadTest User ${i + 1}`,
    phone: `9190000${String(i).padStart(5, "0")}`,
    isTest: true,
  }));

  // Chunk inserts for efficiency and safety
  const CHUNK_SIZE = 500;
  for (let i = 0; i < fakeContactsData.length; i += CHUNK_SIZE) {
    const chunk = fakeContactsData.slice(i, i + CHUNK_SIZE);
    await prisma.contact.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  // 5. DOUBLE SAFETY CHECK: Verify EVERY contact is strictly isTest=true
  const createdContacts = await prisma.contact.findMany({
    where: { listId: contactList.id },
    select: { id: true, phone: true, name: true, isTest: true },
  });

  if (createdContacts.length === 0) {
    console.error("❌ Failed to create test contacts.");
    process.exit(1);
  }

  const unsafeContacts = createdContacts.filter((c) => c.isTest !== true);
  if (unsafeContacts.length > 0) {
    console.error(`🚨 FATAL SAFETY VIOLATION: Found ${unsafeContacts.length} contact(s) NOT marked isTest=true! Refusing execution.`);
    process.exit(1);
  }

  console.log(`🔒 Double safety check passed: All ${createdContacts.length} contacts are strictly marked isTest=true.\n`);

  // 6. Create isTest Campaign
  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      name: `LoadTest Campaign (${count} msgs) - ${new Date().toLocaleTimeString()}`,
      businessName: business.name,
      type: "LOAD_TEST",
      templateId: template.id,
      contactListId: contactList.id,
      status: "DRAFT",
      isTest: true,
      totalRecipients: createdContacts.length,
      bodyVariablesJson: JSON.stringify(["LoadTest User", business.name]),
    },
  });

  // Verify campaign isTest
  if (!campaign.isTest) {
    console.error("🚨 FATAL SAFETY VIOLATION: Campaign was not created with isTest=true! Aborting.");
    process.exit(1);
  }

  console.log(`📢 Created isTest Campaign: "${campaign.name}" (${campaign.id})`);

  // 7. Batch insert MessageLogs
  console.log(`📝 Inserting ${createdContacts.length} pending message logs...`);
  const logsData = createdContacts.map((c) => ({
    id: `test_log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    campaignId: campaign.id,
    contactId: c.id,
    phone: c.phone,
    recipientName: c.name,
    status: "PENDING",
  }));

  for (let i = 0; i < logsData.length; i += CHUNK_SIZE) {
    const chunk = logsData.slice(i, i + CHUNK_SIZE);
    await prisma.messageLog.createMany({
      data: chunk,
    });
  }

  console.log(`🏁 Starting load test dispatch loop via processCampaignSending()...\n`);

  // 8. Track performance and peak memory
  let peakRss = 0;
  let peakHeap = 0;
  const memSampler = setInterval(() => {
    const mem = process.memoryUsage();
    if (mem.rss > peakRss) peakRss = mem.rss;
    if (mem.heapUsed > peakHeap) peakHeap = mem.heapUsed;
  }, 100);

  const startTime = Date.now();

  // Launch sending
  processCampaignSending(campaign.id).catch((err) => {
    console.error("Error during campaign sending process:", err);
  });

  // 9. Poll progress until completion
  let lastReportedSent = 0;
  while (true) {
    await new Promise((r) => setTimeout(r, 200));

    const current = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: {
        status: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
      },
    });

    const pendingCount = await prisma.messageLog.count({
      where: { campaignId: campaign.id, status: { in: ["PENDING", "WAITING_APPROVAL"] } },
    });

    if (current && current.sentCount !== lastReportedSent) {
      lastReportedSent = current.sentCount;
      const pct = Math.round((current.sentCount / count) * 100);
      process.stdout.write(`\r🚀 Dispatched: ${current.sentCount} / ${count} (${pct}%) | Pending: ${pendingCount} | Failed: ${current.failedCount}`);
    }

    if (pendingCount === 0 || current?.status === "COMPLETED" || current?.status === "PAUSED") {
      process.stdout.write(`\r🚀 Dispatched: ${current?.sentCount || count} / ${count} (100%) | Pending: 0 | Failed: ${current?.failedCount || 0}\n`);
      break;
    }
  }

  const endTime = Date.now();
  clearInterval(memSampler);

  // Final stats calculation
  const totalTimeMs = Math.max(1, endTime - startTime);
  const totalTimeSeconds = totalTimeMs / 1000;
  const finalCamp = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    select: { sentCount: true, deliveredCount: true, failedCount: true },
  });

  const totalDispatched = finalCamp?.sentCount || count;
  const totalFailures = finalCamp?.failedCount || 0;
  const msgsPerSec = totalDispatched / totalTimeSeconds;
  const peakMemoryMB = Math.round(peakRss / (1024 * 1024));
  const peakHeapMB = Math.round(peakHeap / (1024 * 1024));

  console.log(`\n============================================================`);
  console.log(`📊 LOAD TEST RESULTS`);
  console.log(`============================================================`);
  console.log(`   • Total Messages:      ${totalDispatched.toLocaleString()} msgs`);
  console.log(`   • Total Time:          ${totalTimeSeconds.toFixed(2)} seconds (${totalTimeMs} ms)`);
  console.log(`   • Throughput:          ${msgsPerSec.toFixed(2)} msgs/sec`);
  console.log(`   • Failures:            ${totalFailures}`);
  console.log(`   • Peak RSS Memory:     ${peakMemoryMB} MB`);
  console.log(`   • Peak Heap Used:      ${peakHeapMB} MB`);
  console.log(`   • Meta API Calls Made: 0 (100% dry-run isolated)`);
  console.log(`============================================================\n`);

  if (shouldCleanupAfter) {
    await cleanupTestData(business.id);
  } else {
    console.log(`💡 To clean up test records created during this run, execute:`);
    console.log(`   npx tsx scripts/loadtest-campaign.ts --cleanup\n`);
  }
}

main()
  .catch((err) => {
    console.error("Fatal error during load test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

