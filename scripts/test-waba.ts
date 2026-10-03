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

async function testWaba() {
  const token = process.env.WA_TOKEN;
  const wabaId = process.env.WA_BUSINESS_ACCOUNT_ID || "150613846549761";
  const phoneId = process.env.WA_PHONE_NUMBER_ID || "118259327494516";

  console.log(`🔍 Testing WABA ID ${wabaId}...`);

  // 1. GET /v19.0/{WABA_ID}
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("WABA Info:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }

  // 2. GET /v19.0/{WABA_ID}/phone_numbers
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("WABA Phone Numbers List:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }

  // 3. GET /v19.0/{WABA_ID}/message_templates
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("WABA Templates:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }
}

testWaba();
