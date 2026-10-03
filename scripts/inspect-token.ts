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

async function inspectToken() {
  const token = process.env.WA_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID;
  const wabaId = process.env.WA_BUSINESS_ACCOUNT_ID;

  console.log("🔍 Inspecting Token & Account Permissions...");

  // 1. GET /v19.0/me
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Me Info:", data);
  } catch (e: any) {
    console.error("GET /me error:", e.message);
  }

  // 2. GET /v19.0/debug_token
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${token}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Debug Token Output:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Debug token error:", e.message);
  }

  // 3. GET /v19.0/me/whatsapp_business_accounts
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Accessible WABAs:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("GET WABAs error:", e.message);
  }

  // 4. Try sending a hello_world message directly to see exact Meta error
  try {
    const payload = {
      messaging_product: "whatsapp",
      to: "919876543210", // placeholder
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
    console.log("\nDirect Send Message Response:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Direct send error:", e.message);
  }
}

inspectToken();
