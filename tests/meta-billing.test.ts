import assert from "assert";
import { buildMetaBillingUrl, getMetaBillingNotes } from "../src/lib/meta-billing";

console.log("Running Meta Billing URL & Helper Tests...\n");

// Test 1: Both ownerBusinessId and wabaId provided
{
  console.log("Test 1: Full account details link (ownerBusinessId + WABA ID)");
  const url = buildMetaBillingUrl({
    ownerBusinessId: "1031619844957884",
    wabaId: "2535786963499275",
  });
  console.log("  Generated URL:", url);
  assert.strictEqual(
    url,
    "https://business.facebook.com/latest/billing_hub/accounts/details?business_id=1031619844957884&asset_id=2535786963499275"
  );
  console.log("  ✅ Test 1 passed.\n");
}

// Test 2: Missing ownerBusinessId (fallback to accounts list scoped to asset_id)
{
  console.log("Test 2: Fallback accounts link (ownerBusinessId missing)");
  const url = buildMetaBillingUrl({
    ownerBusinessId: null,
    wabaId: "2535786963499275",
  });
  console.log("  Generated URL:", url);
  assert.strictEqual(
    url,
    "https://business.facebook.com/latest/billing_hub/accounts?asset_id=2535786963499275"
  );
  console.log("  ✅ Test 2 passed.\n");
}

// Test 3: Note generation with ownerBusinessId present
{
  console.log("Test 3: Instructions when ownerBusinessId is present");
  const notes = getMetaBillingNotes({
    ownerBusinessId: "1031619844957884",
    ownerBusinessName: "Artiqrafts Pvt Ltd",
    wabaName: "Artiqrafts Main WABA",
  });
  console.log("  Notes:", notes);
  assert.strictEqual(
    notes.primaryNote,
    "Add the card under Messaging accounts → Artiqrafts Main WABA, NOT under Ad accounts."
  );
  assert.strictEqual(notes.selectorNote, null, "Selector note should be null when ownerBusinessId is present");
  console.log("  ✅ Test 3 passed.\n");
}

// Test 4: Note generation when ownerBusinessId is missing
{
  console.log("Test 4: Instructions when ownerBusinessId is missing (selector guidance)");
  const notes = getMetaBillingNotes({
    ownerBusinessId: null,
    ownerBusinessName: "Artiqrafts Pvt Ltd",
    wabaName: "Artiqrafts",
  });
  console.log("  Notes:", notes);
  assert.strictEqual(
    notes.primaryNote,
    "Add the card under Messaging accounts → Artiqrafts, NOT under Ad accounts."
  );
  assert.strictEqual(
    notes.selectorNote,
    "Make sure the business selector at top-left shows Artiqrafts Pvt Ltd before adding a card."
  );
  console.log("  ✅ Test 4 passed.\n");
}

// Test 5: Fallback names when names are null
{
  console.log("Test 5: Fallback names when Meta metadata is missing");
  const notes = getMetaBillingNotes({
    ownerBusinessId: null,
    verifiedName: "Vaiva Studios",
  });
  console.log("  Notes:", notes);
  assert.strictEqual(
    notes.primaryNote,
    "Add the card under Messaging accounts → Vaiva Studios, NOT under Ad accounts."
  );
  assert.strictEqual(
    notes.selectorNote,
    "Make sure the business selector at top-left shows Vaiva Studios before adding a card."
  );
  console.log("  ✅ Test 5 passed.\n");
}

console.log("🎉 All Meta Billing unit tests passed successfully!\n");

