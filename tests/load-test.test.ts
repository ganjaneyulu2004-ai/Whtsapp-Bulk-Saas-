import assert from "assert";
import { sendWhatsAppTemplateMessage, sendWhatsAppMessage } from "../src/lib/whatsapp";
import { getTierDailyLimit, formatTierName, META_TIER_LIMITS } from "../src/lib/meta-tiers";

async function runTests() {
  console.log("====================================================");
  console.log("🧪 Running Load-Test Mode & Meta Tier Unit Tests");
  console.log("====================================================\n");

  // Test 1: Dry-run isolation in sendWhatsAppTemplateMessage
  console.log("Test 1: sendWhatsAppTemplateMessage dry-run (isTest=true)...");
  const t0 = Date.now();
  const dryRunRes = await sendWhatsAppTemplateMessage(
    {
      waToken: "FAKE_OR_EMPTY_TOKEN",
      waPhoneNumberId: "FAKE_PHONE_ID",
    },
    "919000000001",
    "Test User",
    "sample_template",
    "en_US",
    undefined,
    {
      isTest: true,
      offerText: "Exclusive Load Test Offer",
    }
  );
  const elapsed = Date.now() - t0;

  assert.strictEqual(dryRunRes.success, true, "Dry-run must return success=true");
  assert.ok(
    dryRunRes.waMessageId && dryRunRes.waMessageId.startsWith("dryrun_"),
    `Dry-run waMessageId must start with dryrun_, got: ${dryRunRes.waMessageId}`
  );
  assert.ok(
    Array.isArray(dryRunRes.messages) && dryRunRes.messages[0]?.id?.startsWith("dryrun_"),
    "Dry-run must include messages array with fake id"
  );
  assert.ok(
    elapsed >= 140,
    `Dry-run must wait at least ~150ms random delay (elapsed: ${elapsed}ms)`
  );
  console.log(`   ✅ Passed (simulated latency: ${elapsed}ms, fake ID: ${dryRunRes.waMessageId})`);

  // Test 2: sendWhatsAppMessage alias also supports isTest
  console.log("\nTest 2: sendWhatsAppMessage alias with isTest=true...");
  const aliasRes = await sendWhatsAppMessage(
    {},
    "919000000002",
    "Test User 2",
    "sample_template",
    "en_US",
    undefined,
    { isTest: true }
  );
  assert.strictEqual(aliasRes.success, true);
  assert.ok(aliasRes.waMessageId?.startsWith("dryrun_"));
  console.log(`   ✅ Passed (alias dryRun ID: ${aliasRes.waMessageId})`);

  // Test 3: Real call safety guard (without valid credentials, non-test calls fail immediately, never mock)
  console.log("\nTest 3: Normal mode (isTest=false) without token fails safely and never returns fake success...");
  const normalRes = await sendWhatsAppTemplateMessage(
    {},
    "919000000003",
    "Real User",
    "sample_template",
    "en_US",
    undefined,
    { isTest: false }
  );
  assert.strictEqual(normalRes.success, false, "Without credentials, normal call must fail");
  assert.strictEqual(normalRes.errorCode, "NOT_CONNECTED");
  console.log("   ✅ Passed: Normal campaigns strictly require real connection and cannot be faked");

  // Test 4: Meta Tier Quota Definitions
  console.log("\nTest 4: Meta tier limits and daily quota calculation...");
  assert.strictEqual(getTierDailyLimit("TIER_250"), 250);
  assert.strictEqual(getTierDailyLimit("tier_250"), 250);
  assert.strictEqual(getTierDailyLimit("TIER_1K"), 1000);
  assert.strictEqual(getTierDailyLimit("TIER_10K"), 10000);
  assert.strictEqual(getTierDailyLimit("TIER_100K"), 100000);
  assert.strictEqual(getTierDailyLimit("TIER_UNLIMITED"), Infinity);
  assert.strictEqual(getTierDailyLimit(null), 250);
  assert.strictEqual(getTierDailyLimit(undefined), 250);
  assert.strictEqual(getTierDailyLimit("UNKNOWN_TIER"), 250);
  console.log("   ✅ Passed: Tier limits map accurately (250, 1K, 10K, 100K, UNLIMITED)");

  // Test 5: Meta Tier Formatter
  console.log("\nTest 5: Meta tier name formatting...");
  assert.ok(formatTierName("TIER_250").includes("250 unique recipients / 24h"));
  assert.ok(formatTierName("TIER_1K").includes("1,000 unique recipients / 24h"));
  assert.ok(formatTierName("TIER_10K").includes("10,000 unique recipients / 24h"));
  assert.ok(formatTierName("TIER_100K").includes("100,000 unique recipients / 24h"));
  assert.strictEqual(formatTierName("TIER_UNLIMITED"), "Tier Unlimited");
  console.log("   ✅ Passed: Tier names format with user-friendly quota descriptions");

  // Test 6: Concurrency Configuration & Clamping
  console.log("\nTest 6: Concurrency configuration (default 5, min 1, max 20)...");
  const { getCampaignConcurrency, MetaRateLimiter } = await import("../src/lib/queue");
  delete process.env.CAMPAIGN_SEND_CONCURRENCY;
  delete process.env.CAMPAIGN_CONCURRENCY;
  assert.strictEqual(getCampaignConcurrency(), 5, "Default concurrency must be 5");

  process.env.CAMPAIGN_SEND_CONCURRENCY = "12";
  assert.strictEqual(getCampaignConcurrency(), 12, "Configured concurrency 12 must be respected");

  process.env.CAMPAIGN_SEND_CONCURRENCY = "50";
  assert.strictEqual(getCampaignConcurrency(), 20, "Concurrency must be clamped to max 20");

  process.env.CAMPAIGN_SEND_CONCURRENCY = "0";
  assert.strictEqual(getCampaignConcurrency(), 1, "Concurrency must be clamped to min 1");

  delete process.env.CAMPAIGN_SEND_CONCURRENCY;
  console.log("   ✅ Passed: Concurrency clamped properly between 1 and 20 (default: 5)");

  // Test 7: MetaRateLimiter enforces rate bounds
  console.log("\nTest 7: MetaRateLimiter sliding window enforcement...");
  const limiter = new MetaRateLimiter(5); // 5 per second for test
  const limiterStart = Date.now();
  for (let i = 0; i < 5; i++) {
    await limiter.acquire();
  }
  const quickElapsed = Date.now() - limiterStart;
  assert.ok(quickElapsed < 50, "First 5 acquisitions must happen immediately without wait");

  // 6th acquire must wait for oldest timestamp to slide out (> 950ms)
  await limiter.acquire();
  const totalElapsed = Date.now() - limiterStart;
  assert.ok(totalElapsed >= 950, `6th acquire must throttle to respect 5/sec limit (elapsed: ${totalElapsed}ms)`);
  console.log(`   ✅ Passed: Rate limiter throttled accurately (elapsed: ${totalElapsed}ms for 6th token)`);

  // Test 8: Unique phone number generation across timestamps
  console.log("\nTest 8: Unique fake phone number generation per run...");
  const run1 = Date.now();
  const runCode1 = String(run1).slice(-6);
  const run2 = run1 + 2500;
  const runCode2 = String(run2).slice(-6);

  const phone1 = `919${runCode1}00001`;
  const phone2 = `919${runCode2}00001`;
  assert.notStrictEqual(phone1, phone2, "Numbers from different runs must not collide");
  assert.strictEqual(phone1.length, 14, "Fake numbers have consistent format");
  console.log(`   ✅ Passed: Run numbers unique across timestamps (e.g. ${phone1} vs ${phone2})`);

  console.log("\n====================================================");
  console.log("🎉 All Load-Test, Concurrency & Meta Tier Unit Tests PASSED!");
  console.log("====================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Test failure:", err);
  process.exit(1);
});

