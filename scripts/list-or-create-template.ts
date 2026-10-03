import fs from "fs";
import path from "path";

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

async function manageTemplates() {
  const token = process.env.WA_TOKEN;
  const wabaId = process.env.WA_BUSINESS_ACCOUNT_ID || "1769046204220658";
  const phoneId = process.env.WA_PHONE_NUMBER_ID || "1182593274945416";

  console.log("🔍 Fetching all templates for WABA:", wabaId);

  // 1. List templates
  const listRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  console.log("Templates list:", JSON.stringify(listData, null, 2));

  // 2. Submit a custom marketing template for Ai With Anji
  const tplName = `welcome_offer_anji_${Date.now()}`;
  console.log(`\n✨ Submitting custom approved marketing template: ${tplName}...`);

  const tplPayload = {
    name: tplName,
    category: "MARKETING",
    language: "en_US",
    components: [
      {
        type: "BODY",
        text: "Hello {{1}}! 🎉 Welcome to Ai With Anji! Enjoy special offers and updates from our business.",
        example: {
          body_text: [["Anji"]],
        },
      },
      {
        type: "FOOTER",
        text: "Reply STOP to unsubscribe",
      },
    ],
  };

  const createRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tplPayload),
  });

  const createData = await createRes.json();
  console.log("Create Template Response:", JSON.stringify(createData, null, 2));
}

manageTemplates();
