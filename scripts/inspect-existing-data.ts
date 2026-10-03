import { prisma } from "../src/lib/prisma";

async function main() {
  const templates = await prisma.template.findMany({
    select: { id: true, name: true, headerMediaUrl: true, headerHandle: true },
  });
  console.log("Templates found:", templates.length);
  for (const t of templates) {
    console.log(`- ${t.name}: mediaUrl length=${t.headerMediaUrl?.length || 0}, handle=${t.headerHandle}`);
  }

  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true, businessName: true, bookingLink: true, template: true },
  });
  console.log("Campaigns found:", campaigns.length);
  for (const c of campaigns) {
    console.log(`- Campaign: ${c.name}, tpl=${c.template?.name}, mediaUrl=${c.template?.headerMediaUrl ? "YES" : "NO"}`);
  }

  const contacts = await prisma.contact.findMany({
    take: 10,
    select: { id: true, name: true, phone: true },
  });
  console.log("Contacts:", contacts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
