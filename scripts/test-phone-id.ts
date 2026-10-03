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

async function testPhoneId() {
  const token = process.env.WA_TOKEN;
  const phoneId = "1182593274945416";

  console.log(`🔍 Testing corrected Phone Number ID: ${phoneId}...`);

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Phone Number Details:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

testPhoneId();
