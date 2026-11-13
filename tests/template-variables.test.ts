import assert from "node:assert";
import {
  detectVariableSlotType,
  generateOfferFallbackFromProfile,
  getGenericFallbackForVariable,
  resolveAllTemplateVariables,
} from "../src/lib/template-variables";

console.log("Running Template Variable AI Fill Tests...\n");

// --- TEST 1: vaiva_special_offer ---
{
  console.log("Test 1: vaiva_special_offer");
  const templateBody =
    "Hi {{1}}, Vaiva Studios has a special offer for you: {{2}}. Offer valid till {{3}}. Reply YES to book your slot.";

  // 1a. Verify slot type detection primarily from text BEFORE {{n}}
  assert.strictEqual(detectVariableSlotType(templateBody, 1), "NAME", "{{1}} should be detected as NAME");
  assert.strictEqual(detectVariableSlotType(templateBody, 2), "OFFER", "{{2}} should be detected as OFFER (not DATE)");
  assert.strictEqual(detectVariableSlotType(templateBody, 3), "DATE", "{{3}} should be detected as DATE");

  // 1b. Verify resolution with business profile
  const bizWithProfile = {
    name: "Vaiva Studios",
    servicesAndPricing: "Podcast, video shoot & green screen studio sessions @ ₹1,999/hour",
    businessDescription: "Professional creative studio for audio and video creators",
  };

  const resolved = resolveAllTemplateVariables(templateBody, null, bizWithProfile);

  console.log("  Resolved with profile:", resolved);

  // {{1}} = dynamic contact name or Customer
  assert.strictEqual(resolved[1], "Customer");

  // {{2}} = short honest line from business profile, NOT date fallback
  assert.notStrictEqual(resolved[2], "a limited time", "BUG CHECK: {{2}} must NOT be 'a limited time'");
  assert.strictEqual(
    resolved[2],
    "special pricing on podcast & video studio sessions",
    "{{2}} should reflect business profile without inventing prices/percentages"
  );

  // {{3}} = valid-till date slot
  assert.strictEqual(resolved[3], "a limited time", "{{3}} should be date fallback 'a limited time'");

  // Verify all 3 variables are distinct
  assert.notStrictEqual(resolved[1], resolved[2], "{{1}} and {{2}} must be distinct");
  assert.notStrictEqual(resolved[2], resolved[3], "{{2}} and {{3}} must be distinct");
  assert.notStrictEqual(resolved[1], resolved[3], "{{1}} and {{3}} must be distinct");

  // 1c. Verify resolution with empty business profile
  const resolvedEmptyBiz = resolveAllTemplateVariables(templateBody, null, { name: "Vaiva Studios" });
  console.log("  Resolved with empty profile:", resolvedEmptyBiz);
  assert.strictEqual(resolvedEmptyBiz[2], "special pricing on our services");
  assert.strictEqual(resolvedEmptyBiz[3], "a limited time");
  assert.notStrictEqual(resolvedEmptyBiz[2], resolvedEmptyBiz[3]);

  console.log("  ✅ vaiva_special_offer passed.\n");
}

// --- TEST 2: vaiva_photo_offer ---
{
  console.log("Test 2: vaiva_photo_offer");
  const templateBody =
    "Hi {{1}}, get {{2}} on all photo shoots at Vaiva Studios! Valid till {{3}}. Book now: {{4}}";

  assert.strictEqual(detectVariableSlotType(templateBody, 1), "NAME");
  assert.strictEqual(detectVariableSlotType(templateBody, 2), "OFFER");
  assert.strictEqual(detectVariableSlotType(templateBody, 3), "DATE");
  assert.strictEqual(detectVariableSlotType(templateBody, 4), "LINK");

  const biz = {
    name: "Vaiva Studios",
    servicesAndPricing: "Photography, portrait and photo shoots with editing support",
    bookingLink: "https://vaivastudios.com/booking",
  };

  const resolved = resolveAllTemplateVariables(templateBody, null, biz);
  console.log("  Resolved:", resolved);

  assert.strictEqual(resolved[1], "Customer");
  assert.strictEqual(resolved[2], "special pricing on photography & studio sessions");
  assert.strictEqual(resolved[3], "a limited time");
  assert.strictEqual(resolved[4], "https://vaivastudios.com/booking");

  // Verify uniqueness across all 4 variables
  const values = Object.values(resolved);
  const uniqueValues = new Set(values.map((v) => v.toLowerCase()));
  assert.strictEqual(uniqueValues.size, values.length, "All 4 variables must have distinct fallbacks");

  // Also test variation with Call / Phone
  const templateBodyCall =
    "Hello {{1}}, Vaiva Studios has an exclusive photo offer for you: {{2}}. Offer valid till {{3}}. Call {{4}} to book your session.";
  const resolvedCall = resolveAllTemplateVariables(templateBodyCall, null, {
    ...biz,
    phone: "+91 8008959608",
  });
  console.log("  Resolved call variant:", resolvedCall);
  assert.strictEqual(detectVariableSlotType(templateBodyCall, 2), "OFFER");
  assert.strictEqual(detectVariableSlotType(templateBodyCall, 3), "DATE");
  assert.strictEqual(detectVariableSlotType(templateBodyCall, 4), "PHONE");
  assert.strictEqual(resolvedCall[4], "+91 8008959608");

  console.log("  ✅ vaiva_photo_offer passed.\n");
}

// --- TEST 3: offer_update_v1 ---
{
  console.log("Test 3: offer_update_v1");
  const templateBody =
    "Dear {{1}},\n\nWe have an offer for you: {{2}}\n\nThank you for shopping with {{3}}. Have a great day!";

  assert.strictEqual(detectVariableSlotType(templateBody, 1), "NAME");
  assert.strictEqual(detectVariableSlotType(templateBody, 2), "OFFER");
  assert.strictEqual(detectVariableSlotType(templateBody, 3), "BUSINESS_NAME");

  const biz = {
    name: "Vaiva Studios",
    recipientName: "Ravi Kumar",
    servicesAndPricing: "Podcast, video shoot & green screen studio sessions",
  };

  const resolved = resolveAllTemplateVariables(templateBody, null, biz);
  console.log("  Resolved:", resolved);

  assert.strictEqual(resolved[1], "Ravi Kumar", "{{1}} should be contact name");
  assert.strictEqual(resolved[2], "special pricing on podcast & video studio sessions", "{{2}} should be offer");
  assert.strictEqual(resolved[3], "Vaiva Studios", "{{3}} should be business name");

  // Verify distinctness
  assert.notStrictEqual(resolved[1], resolved[2]);
  assert.notStrictEqual(resolved[2], resolved[3]);
  assert.notStrictEqual(resolved[1], resolved[3]);

  console.log("  ✅ offer_update_v1 passed.\n");
}

// --- TEST 4: Anti-collision & Never Invent Prices/Percentages ---
{
  console.log("Test 4: Anti-collision and price sanitization");

  // 4a. Profile with prices and discounts should be completely stripped
  const profileWithPrices = {
    servicesAndPricing: "Podcast & video studio sessions @ ₹1,999/hour with 25% discount and flat 500 off",
  };
  const offerLine = generateOfferFallbackFromProfile(profileWithPrices);
  assert.strictEqual(
    offerLine,
    "special pricing on podcast & video studio sessions",
    "Should strip price tokens like ₹1,999 and percentages like 25%"
  );
  assert.ok(!offerLine.includes("1,999"), "Must not invent or pass price numbers");
  assert.ok(!offerLine.includes("25%"), "Must not invent or pass discount percentages");

  // 4b. Template with multiple date slots must not receive the same fallback
  const multiDateTemplate = "Dear {{1}}, offer valid till {{2}}. Extension valid till {{3}}.";
  const multiDateResolved = resolveAllTemplateVariables(multiDateTemplate, null, null);
  console.log("  Multi-date resolved:", multiDateResolved);
  assert.strictEqual(detectVariableSlotType(multiDateTemplate, 2), "DATE");
  assert.strictEqual(detectVariableSlotType(multiDateTemplate, 3), "DATE");
  assert.strictEqual(multiDateResolved[2], "a limited time");
  assert.strictEqual(multiDateResolved[3], "this week");
  assert.notStrictEqual(
    multiDateResolved[2],
    multiDateResolved[3],
    "Multiple slots of the same type must receive distinct fallbacks"
  );

  // 4c. Template with multiple offer slots must not receive the same fallback
  const multiOfferTemplate = "Dear {{1}}, special offer for you: {{2}}. Also get {{3}}!";
  const multiOfferResolved = resolveAllTemplateVariables(multiOfferTemplate, null, null);
  console.log("  Multi-offer resolved:", multiOfferResolved);
  assert.strictEqual(detectVariableSlotType(multiOfferTemplate, 2), "OFFER");
  assert.strictEqual(detectVariableSlotType(multiOfferTemplate, 3), "OFFER");
  assert.strictEqual(multiOfferResolved[2], "special pricing on our services");
  assert.strictEqual(multiOfferResolved[3], "exclusive seasonal savings");
  assert.notStrictEqual(
    multiOfferResolved[2],
    multiOfferResolved[3],
    "Multiple offer slots must receive distinct fallbacks"
  );

  console.log("  ✅ Anti-collision passed.\n");
}

console.log("🎉 All template variable unit tests passed successfully!");
