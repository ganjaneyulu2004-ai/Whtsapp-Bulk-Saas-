import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function sendTestTemplate() {
  const token = process.env.WA_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID || "1182593274945416";
  const recipientPhone = process.argv[2] || "919390484762";

  console.log(`🚀 Sending Meta 'hello_world' template message to +${recipientPhone}...`);

  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "template",
      template: {
        name: "hello_world",
        language: { code: "en_US" },
      },
    };

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Meta API Response:", JSON.stringify(data, null, 2));

    if (res.ok && data.messages?.[0]?.id) {
      const waMsgId = data.messages[0].id;
      console.log(`\n✅ Message SENT SUCCESSFULLY!`);
      console.log(`- WhatsApp Message ID (wamid): ${waMsgId}`);

      // Save into Database MessageLog so it appears in History & Reports page
      const business = await prisma.business.findFirst();
      let campaign = await prisma.campaign.findFirst({ where: { name: "Meta WhatsApp Live Test Blast" } });

      if (!campaign) {
        let tpl = await prisma.template.findFirst({ where: { name: "hello_world" } });
        if (!tpl) {
          tpl = await prisma.template.create({
            data: {
              businessId: business!.id,
              name: "hello_world",
              category: "UTILITY",
              language: "en_US",
              bodyText: "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta.",
              status: "APPROVED",
            },
          });
        }
        campaign = await prisma.campaign.create({
          data: {
            businessId: business!.id,
            name: "Meta WhatsApp Live Test Blast",
            type: "ANNOUNCEMENT",
            templateId: tpl.id,
            status: "SENDING",
            totalRecipients: 1,
            sentCount: 1,
          },
        });
      }

      const log = await prisma.messageLog.create({
        data: {
          campaignId: campaign.id,
          phone: recipientPhone,
          recipientName: "Test Customer",
          waMessageId: waMsgId,
          status: "SENT",
          sentAt: new Date(),
        },
      });

      console.log(`✅ MessageLog row created in DB with ID: ${log.id}`);
      console.log(`📊 You can view this live in OfferBlast Dashboard under History & Reports!`);
    } else {
      console.error(`❌ Send Failed (${data.error?.code}):`, data.error?.message);
      if (data.error?.error_data?.details) {
        console.error("  Details:", data.error.error_data.details);
      }
    }
  } catch (err: any) {
    console.error("Network error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

sendTestTemplate();
