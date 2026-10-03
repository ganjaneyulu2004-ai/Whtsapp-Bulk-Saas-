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

async function checkStatus() {
  const token = process.env.WA_TOKEN;
  const wabaId = process.env.WA_BUSINESS_ACCOUNT_ID || "1769046204220658";

  const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.data) {
    console.log("Current Templates:");
    data.data.forEach((t: any) => {
      console.log(`- Name: "${t.name}" | Status: "${t.status}" | Category: "${t.category}" | Language: "${t.language}"`);
    });
  }
}

checkStatus();
