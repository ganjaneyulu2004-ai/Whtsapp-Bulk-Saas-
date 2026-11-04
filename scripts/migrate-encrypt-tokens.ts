import fs from "fs";
import path from "path";

// 1. Ensure .env is loaded before importing encryption and prisma
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
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

import { prisma } from "../src/lib/prisma";
import { encryptToken } from "../src/lib/encryption";

async function main() {
  console.log("=================================================");
  console.log("🔒 WhatsApp Token At-Rest Encryption Migration");
  console.log("=================================================");

  const configs = await prisma.whatsAppConfig.findMany({
    select: {
      id: true,
      waToken: true,
      businessId: true,
    },
  });

  console.log(`Found ${configs.length} WhatsApp configuration record(s) in database.`);

  let newlyEncrypted = 0;
  let alreadyEncrypted = 0;
  let skipped = 0;

  for (const cfg of configs) {
    const raw = cfg.waToken?.trim();

    if (!raw) {
      skipped++;
      continue;
    }

    if (raw.startsWith("enc:v1:")) {
      alreadyEncrypted++;
      continue;
    }

    // Encrypt plain-text token
    const encrypted = encryptToken(raw);
    if (encrypted) {
      await prisma.whatsAppConfig.update({
        where: { id: cfg.id },
        data: { waToken: encrypted },
      });
      newlyEncrypted++;
    } else {
      skipped++;
    }
  }

  console.log("-------------------------------------------------");
  console.log(`Migration complete: ${newlyEncrypted} token(s) newly encrypted, ${alreadyEncrypted} already encrypted, ${skipped} skipped.`);
  console.log("=================================================");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

