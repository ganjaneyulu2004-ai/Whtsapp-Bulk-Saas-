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

async function testNewWaba() {
  const token = process.env.WA_TOKEN;
  const newWabaId = "1769046204220658"; // From user's screenshot

  console.log(`🔍 Testing WABA ID from screenshot: ${newWabaId}...`);

  // 1. GET /v19.0/1769046204220658
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${newWabaId}?fields=id,name,account_review_status,business`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("WABA Info Result:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }

  // 2. GET /v19.0/1769046204220658/phone_numbers
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${newWabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Phone Numbers List:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }

  // 3. GET /v19.0/1769046204220658/message_templates
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${newWabaId}/message_templates?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Message Templates List:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }
}

testNewWaba();
