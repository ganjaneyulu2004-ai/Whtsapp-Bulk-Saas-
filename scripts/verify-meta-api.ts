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

async function verifyWithVersion(ver: string) {
  const token = process.env.WA_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID || "118259327494516";
  const wabaId = process.env.WA_BUSINESS_ACCOUNT_ID || "150613846549761";

  console.log(`\n================ Testing API Version: ${ver} ================`);

  // 1. GET /{PHONE_NUMBER_ID}
  console.log("--- 1. Phone Details ---");
  try {
    const res = await fetch(`https://graph.facebook.com/${ver}/${phoneId}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Display Phone Number: ${data.display_phone_number || "N/A"}`);
      console.log(`✅ Verified Name: ${data.verified_name || "N/A"}`);
      console.log(`✅ Quality Rating: ${data.quality_rating || "N/A"}`);
    } else {
      console.error(`❌ Phone Error Code ${data.error?.code} (${data.error?.error_subcode || ""}):`, data.error?.message);
    }
  } catch (err: any) {
    console.error("Network error:", err.message);
  }

  // 2. GET /{WABA_ID}/message_templates
  console.log("--- 2. Templates List ---");
  try {
    const res = await fetch(`https://graph.facebook.com/${ver}/${wabaId}/message_templates?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok && data.data) {
      console.log(`✅ Found ${data.data.length} templates:`);
      data.data.forEach((tpl: any, idx: number) => {
        console.log(`  ${idx + 1}. Name: "${tpl.name}" | Language: "${tpl.language}" | Status: "${tpl.status}"`);
      });
    } else {
      console.error(`❌ Templates Error Code ${data.error?.code}:`, data.error?.message);
    }
  } catch (err: any) {
    console.error("Network error:", err.message);
  }
}

async function main() {
  await verifyWithVersion("v19.0");
  await verifyWithVersion("v20.0");
}

main();
