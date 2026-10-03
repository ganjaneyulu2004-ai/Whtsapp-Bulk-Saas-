import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runWebhookTests() {
  console.log("🧪 Starting Meta WhatsApp Webhook Integration Test Suite...\n");

  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
  const verifyToken = process.env.WA_VERIFY_TOKEN || process.env.WA_WEBHOOK_VERIFY_TOKEN || "offerblast_verify_token_123";

  // Test 1: GET Meta Verification Challenge
  console.log("1️⃣ Testing GET verification handshake...");
  const fakeChallenge = `test_challenge_${Date.now()}`;
  const getUrl = `${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=${encodeURIComponent(fakeChallenge)}`;

  try {
    const getRes = await fetch(getUrl);
    const textResp = await getRes.text();

    if (getRes.status === 200 && textResp === fakeChallenge) {
      console.log("   ✅ GET Verification PASSED! Echoed back exact hub.challenge:", textResp);
    } else {
      console.error(`   ❌ GET Verification FAILED. Status: ${getRes.status}, Response: "${textResp}"`);
    }
  } catch (err: any) {
    console.error("   ❌ Failed to connect to server:", err.message);
  }

  // Test 2: POST Event Status Update
  console.log("\n2️⃣ Testing POST status update delivery payload...");

  // Find or create a test MessageLog in database
  let testLog = await prisma.messageLog.findFirst({
    where: { waMessageId: { not: null } },
  });

  if (!testLog) {
    const campaign = await prisma.campaign.findFirst() || await prisma.campaign.create({
      data: {
        businessId: "demo-business-id",
        name: "Test Webhook Campaign",
        type: "OFFER",
        templateId: "demo-template-id",
        status: "SENDING",
      },
    });

    testLog = await prisma.messageLog.create({
      data: {
        campaignId: campaign.id,
        phone: "919876543210",
        recipientName: "Test Recipient",
        waMessageId: `wamid.TestId_${Date.now()}`,
        status: "SENT",
      },
    });
  }

  const samplePayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "104829375987654",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+91 98765 43210",
                phone_number_id: "100609346123456",
              },
              statuses: [
                {
                  id: testLog.waMessageId,
                  status: "delivered",
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: testLog.phone,
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  const payloadString = JSON.stringify(samplePayload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.META_APP_SECRET && process.env.META_APP_SECRET !== "from_meta_app_settings_basic") {
    const signature = crypto
      .createHmac("sha256", process.env.META_APP_SECRET)
      .update(payloadString, "utf-8")
      .digest("hex");
    headers["x-hub-signature-256"] = `sha256=${signature}`;
  }

  try {
    const postRes = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers,
      body: payloadString,
    });

    const postJson = await postRes.json();
    console.log("   Received HTTP status:", postRes.status, postJson);

    // Wait 500ms for background DB update
    await new Promise((r) => setTimeout(r, 500));

    const updatedLog = await prisma.messageLog.findUnique({
      where: { id: testLog.id },
    });

    if (updatedLog?.status === "DELIVERED") {
      console.log(`   ✅ POST Status Update PASSED! MessageLog ${testLog.id} status updated to DELIVERED.`);
    } else {
      console.log(`   ⚠️ MessageLog status is currently '${updatedLog?.status}'.`);
    }
  } catch (err: any) {
    console.error("   ❌ POST Status Update FAILED:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runWebhookTests();
