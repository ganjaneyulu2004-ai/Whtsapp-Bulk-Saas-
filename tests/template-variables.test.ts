import assert from "node:assert";
import {
  detectVariableSlotType,
  extractCleanServiceItem,
  generateOfferFallbackFromProfile,
  getGenericFallbackForVariable,
  resolveAllTemplateVariables,
} from "../src/lib/template-variables";

console.log("Running Template Variable AI Fill Tests...\n");

// --- TEST 1: Vaiva's Real Profile Values & Offer Fallback ---
{
  console.log("Test 1: Vaiva Studios Real Profile Values");
  const vaivaProfile = {
    name: "Vaiva Studios",
    category: "Photography & Photo Studio",
    servicesAndPricing: "Content Creation Session ₹15,000\nStudio Space ₹5,000",
    businessDescription: "Creative photography, podcast and content creation studio",
  };

  const extractedItem = extractCleanServiceItem(vaivaProfile.servicesAndPricing);
  assert.strictEqual(extractedItem, "Content Creation Session", "Should extract first service item without prices");

  const offerFallback = generateOfferFallbackFromProfile(vaivaProfile);
  console.log("  Vaiva Offer Fallback:", offerFallback);

  assert.strictEqual(
    offerFallback,
    "special pricing on content creation sessions",
    "Must produce 'special pricing on content creation sessions' from servicesAndPricing"
  );
  assert.notStrictEqual(
    offerFallback,
    "special pricing on salon & beauty services",
    "Must NEVER produce salon/beauty for a photography studio"
  );

  // 1b. Test cascade when servicesAndPricing is empty -> uses category label
  const categoryOnlyProfile = {
    name: "Vaiva Studios",
    category: "Photography & Photo Studio",
  };
  const categoryFallback = generateOfferFallbackFromProfile(categoryOnlyProfile);
  console.log("  Category-only Fallback:", categoryFallback);
  assert.strictEqual(
    categoryFallback,
    "special pricing on photography & photo studio services",
    "Should use business's own category label when services are empty"
  );

  // 1c. Test cascade when services & category are empty -> uses business name
  const nameOnlyProfile = {
    name: "Vaiva Studios",
  };
  const nameFallback = generateOfferFallbackFromProfile(nameOnlyProfile);
  console.log("  Name-only Fallback:", nameFallback);
  assert.strictEqual(nameFallback, "special pricing at Vaiva Studios");

  // 1d. Test cascade when profile is completely empty -> "special pricing on our services"
  const emptyFallback = generateOfferFallbackFromProfile(null);
  assert.strictEqual(emptyFallback, "special pricing on our services");

  console.log("  ✅ Vaiva real profile test passed.\n");
}

// --- TEST 2: vaiva_special_offer with Real Profile & DATE Fallback ---
{
  console.log("Test 2: vaiva_special_offer with real profile and DATE fallback");
  const templateBody =
    "Hi {{1}}, Vaiva Studios has a special offer for you: {{2}}. Offer valid till {{3}}. Reply YES to book your slot.";

  assert.strictEqual(detectVariableSlotType(templateBody, 1), "NAME");
  assert.strictEqual(detectVariableSlotType(templateBody, 2), "OFFER");
  assert.strictEqual(detectVariableSlotType(templateBody, 3), "DATE");

  const vaivaProfile = {
    name: "Vaiva Studios",
    category: "Photography & Photo Studio",
    servicesAndPricing: "Content Creation Session ₹15,000\nStudio Space ₹5,000",
  };

  const resolved = resolveAllTemplateVariables(templateBody, null, vaivaProfile);
  console.log("  Resolved vaiva_special_offer:", resolved);

  // {{1}} = dynamic contact name or Customer
  assert.strictEqual(resolved[1], "Customer");

  // {{2}} = offer fallback from profile
  assert.strictEqual(resolved[2], "special pricing on content creation sessions");

  // {{3}} = "valid till" context -> "slots last" (reads "Offer valid till slots last")
  assert.strictEqual(resolved[3], "slots last", "When text before is 'valid till', date fallback must be 'slots last'");

  // Verify full message sentence reads naturally
  const fullText = templateBody
    .replace("{{1}}", resolved[1])
    .replace("{{2}}", resolved[2])
    .replace("{{3}}", resolved[3]);
  console.log("  Rendered text:", fullText);
  assert.ok(fullText.includes("Offer valid till slots last."), "Rendered sentence must read 'Offer valid till slots last.'");

  // Verify all variables are distinct
  assert.notStrictEqual(resolved[1], resolved[2]);
  assert.notStrictEqual(resolved[2], resolved[3]);
  assert.notStrictEqual(resolved[1], resolved[3]);

  // Also test with "until" context
  const untilTemplate = "Dear {{1}}, special offer for you: {{2}}. Valid until {{3}}.";
  const untilResolved = resolveAllTemplateVariables(untilTemplate, null, vaivaProfile);
  console.log("  Until template resolved:", untilResolved);
  assert.strictEqual(untilResolved[3], "slots last", "When text before is 'valid until', date fallback must be 'slots last'");

  // Also test other date contexts (e.g. "ends on", "before", "last date") keep "a limited time"
  const endsOnTemplate = "Dear {{1}}, special offer for you: {{2}}. Promotion ends on {{3}}.";
  const endsOnResolved = resolveAllTemplateVariables(endsOnTemplate, null, vaivaProfile);
  console.log("  Ends-on template resolved:", endsOnResolved);
  assert.strictEqual(endsOnResolved[3], "a limited time", "For other date contexts like 'ends on', date fallback must be 'a limited time'");

  console.log("  ✅ vaiva_special_offer test passed.\n");
}

// --- TEST 3: vaiva_photo_offer ---
{
  console.log("Test 3: vaiva_photo_offer");
  const templateBody =
    "Hi {{1}}, get {{2}} on all photo shoots at Vaiva Studios! Valid till {{3}}. Book now: {{4}}";

  assert.strictEqual(detectVariableSlotType(templateBody, 1), "NAME");
  assert.strictEqual(detectVariableSlotType(templateBody, 2), "OFFER");
  assert.strictEqual(detectVariableSlotType(templateBody, 3), "DATE");
  assert.strictEqual(detectVariableSlotType(templateBody, 4), "LINK");

  const vaivaProfile = {
    name: "Vaiva Studios",
    category: "Photography & Photo Studio",
    servicesAndPricing: "Content Creation Session ₹15,000",
    bookingLink: "https://vaivastudios.com/booking",
  };

  const resolved = resolveAllTemplateVariables(templateBody, null, vaivaProfile);
  console.log("  Resolved vaiva_photo_offer:", resolved);

  assert.strictEqual(resolved[1], "Customer");
  assert.strictEqual(resolved[2], "special pricing on content creation sessions");
  assert.strictEqual(resolved[3], "slots last");
  assert.strictEqual(resolved[4], "https://vaivastudios.com/booking");

  // Verify uniqueness across all 4 variables
  const values = Object.values(resolved);
  const uniqueValues = new Set(values.map((v) => v.toLowerCase()));
  assert.strictEqual(uniqueValues.size, values.length, "All 4 variables must have distinct fallbacks");

  console.log("  ✅ vaiva_photo_offer passed.\n");
}

// --- TEST 4: offer_update_v1 ---
{
  console.log("Test 4: offer_update_v1");
  const templateBody =
    "Dear {{1}},\n\nWe have an offer for you: {{2}}\n\nThank you for shopping with {{3}}. Have a great day!";

  assert.strictEqual(detectVariableSlotType(templateBody, 1), "NAME");
  assert.strictEqual(detectVariableSlotType(templateBody, 2), "OFFER");
  assert.strictEqual(detectVariableSlotType(templateBody, 3), "BUSINESS_NAME");

  const vaivaProfile = {
    name: "Vaiva Studios",
    recipientName: "Ravi Kumar",
    category: "Photography & Photo Studio",
    servicesAndPricing: "Content Creation Session ₹15,000",
  };

  const resolved = resolveAllTemplateVariables(templateBody, null, vaivaProfile);
  console.log("  Resolved offer_update_v1:", resolved);

  assert.strictEqual(resolved[1], "Ravi Kumar", "{{1}} should be contact name");
  assert.strictEqual(resolved[2], "special pricing on content creation sessions", "{{2}} should be offer");
  assert.strictEqual(resolved[3], "Vaiva Studios", "{{3}} should be business name");

  // Verify distinctness
  assert.notStrictEqual(resolved[1], resolved[2]);
  assert.notStrictEqual(resolved[2], resolved[3]);
  assert.notStrictEqual(resolved[1], resolved[3]);

  console.log("  ✅ offer_update_v1 passed.\n");
}

// --- TEST 5: Anti-collision & Date Alternates ---
{
  console.log("Test 5: Anti-collision and Date Alternates");

  // 5a. Multiple valid-till slots should get non-duplicate fallbacks
  const multiTillTemplate = "Dear {{1}}, offer valid till {{2}}. Extension valid till {{3}}.";
  const multiTillResolved = resolveAllTemplateVariables(multiTillTemplate, null, null);
  console.log("  Multi-till resolved:", multiTillResolved);
  assert.strictEqual(multiTillResolved[2], "slots last");
  assert.strictEqual(multiTillResolved[3], "stocks last");
  assert.notStrictEqual(multiTillResolved[2], multiTillResolved[3]);

  // 5b. Multiple ends-on slots should get non-duplicate fallbacks
  const multiEndsTemplate = "Dear {{1}}, sale ends on {{2}}. Final event ends on {{3}}.";
  const multiEndsResolved = resolveAllTemplateVariables(multiEndsTemplate, null, null);
  console.log("  Multi-ends resolved:", multiEndsResolved);
  assert.strictEqual(multiEndsResolved[2], "a limited time");
  assert.strictEqual(multiEndsResolved[3], "this week");
  assert.notStrictEqual(multiEndsResolved[2], multiEndsResolved[3]);

  console.log("  ✅ Anti-collision passed.\n");
}

console.log("🎉 All template variable unit tests passed successfully!");
