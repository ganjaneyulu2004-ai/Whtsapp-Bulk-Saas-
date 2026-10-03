import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding iBrainLabs database...");

  // 1. Create or update Admin User from .env
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@iBrainLabs2026";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      name: "iBrainLabs Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    create: {
      username: adminUsername,
      name: "iBrainLabs Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });
  console.log(`✅ Admin user ready (${adminUsername}) with role ADMIN`);

  // 2. Create Demo User
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { username: "ramesh" },
    update: {
      role: "USER",
    },
    create: {
      username: "ramesh",
      email: "owner@balajisilks.com",
      name: "Ramesh Verma",
      passwordHash,
      role: "USER",
    },
  });

  // Ensure Demo User has an active subscription
  const existingSub = await prisma.subscription.findFirst({
    where: { userId: user.id },
  });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "Growth",
        amount: 2499,
        status: "ACTIVE",
        utrNumber: "123456789012",
        payerName: "Ramesh Verma",
        payerMobile: "+919876543210",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(),
      },
    });
  }

  // 3. Create Demo Business
  const business = await prisma.business.upsert({
    where: { id: "demo-business-id" },
    update: {},
    create: {
      id: "demo-business-id",
      userId: user.id,
      name: "Sri Balaji Silks & Fashions",
      category: "Clothing & Saree Store",
      phone: "+91 98765 43210",
      address: "MG Road, Vijayawada, Andhra Pradesh",
      perMessageCost: 0.80,
      language: "en",
    },
  });

  // 4. Create WhatsApp Config if missing
  const existingWa = await prisma.whatsAppConfig.findUnique({
    where: { businessId: business.id },
  });
  if (!existingWa) {
    await prisma.whatsAppConfig.create({
      data: {
        businessId: business.id,
        waToken: "EAAG...DEMO_TOKEN_ACTIVE",
        waPhoneNumberId: "100609346123456",
        waBusinessAccountId: "104829375987654",
        waApiVersion: "v26.0",
        metaAppId: "987654321",
        messagingLimitTier: "TIER_1K",
        isConnected: true,
      },
    });
  }

  // 5. Check if templates already exist
  let template1 = await prisma.template.findFirst({
    where: { businessId: business.id, name: "ugadi_saree_mega_sale_2026" },
  });
  if (!template1) {
    template1 = await prisma.template.create({
      data: {
        businessId: business.id,
        name: "ugadi_saree_mega_sale_2026",
        category: "MARKETING",
        language: "en",
        headerType: "IMAGE",
        headerMediaUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
        bodyText: "Hello {{1}}! 🌸\n\n🎉 *Ugadi Mega Saree Festival at Sri Balaji Silks!*\n\nGet Flat 25% OFF on Kanjeevaram, Pattu & Designer Sarees till Sunday evening.\n\n📍 Visit our MG Road store today or order on WhatsApp!",
        footerText: "Reply STOP to unsubscribe",
        buttonsJson: JSON.stringify([
          { type: "PHONE_NUMBER", text: "Call Shop", value: "+919876543210" },
          { type: "QUICK_REPLY", text: "Send Location" },
        ]),
        status: "APPROVED",
      },
    });
  }

  let template2 = await prisma.template.findFirst({
    where: { businessId: business.id, name: "weekend_vip_clearance_sale" },
  });
  if (!template2) {
    template2 = await prisma.template.create({
      data: {
        businessId: business.id,
        name: "weekend_vip_clearance_sale",
        category: "MARKETING",
        language: "te",
        headerType: "IMAGE",
        headerMediaUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80",
        bodyText: "నమస్కారం {{1}} గారు! ✨\n\n🎉 *శ్రీ బాలాజీ సిల్క్స్ ప్రత్యేక వీకెండ్ ఆఫర్!*\n\nమా విఐపి కస్టమర్ల కోసం అన్ని పట్టు చీరలపై 20% డిస్కౌంట్. ఈ మెసేజ్ చూపించి ప్రత్యేక గిఫ్ట్ పొందండి. 🎁",
        footerText: "ఆఫర్లు ఆపివేయడానికి STOP అని పంపండి",
        buttonsJson: JSON.stringify([
          { type: "QUICK_REPLY", text: "నాకు ఆఫర్ కావాలి" },
        ]),
        status: "APPROVED",
      },
    });
  }

  // 6. Check Contacts
  let list1 = await prisma.contactList.findFirst({
    where: { businessId: business.id },
  });
  if (!list1) {
    list1 = await prisma.contactList.create({
      data: {
        businessId: business.id,
        name: "Regular Saree VIP Customers",
        description: "Frequent shoppers from Vijayawada & Guntur",
        contactCount: 15,
      },
    });

    const sampleContactsData = [
      { name: "Anitha Reddy", phone: "919848012345" },
      { name: "Suresh Babu", phone: "919848023456" },
      { name: "Priya Sharma", phone: "919848034567" },
      { name: "Lakshmi Rao", phone: "919848045678" },
      { name: "Venkat Rao", phone: "919848056789" },
      { name: "Kavitha Swamy", phone: "919848067890" },
      { name: "Ravi Teja", phone: "919848078901" },
      { name: "Sunitha Devi", phone: "919848089012" },
      { name: "Bhavani Prasad", phone: "919848090123" },
      { name: "Madhavi Latha", phone: "919848101234" },
      { name: "Rajesh Kumar", phone: "919848112345" },
      { name: "Swapna Kumari", phone: "919848123456" },
      { name: "Narayana Murthy", phone: "919848134567" },
      { name: "Padma Vani", phone: "919848145678" },
      { name: "Srikanth Naidu", phone: "919848156789" },
    ];

    const createdContacts = [];
    for (const c of sampleContactsData) {
      const contact = await prisma.contact.create({
        data: {
          businessId: business.id,
          listId: list1.id,
          name: c.name,
          phone: c.phone,
        },
      });
      createdContacts.push(contact);
    }

    const camp1 = await prisma.campaign.create({
      data: {
        businessId: business.id,
        name: "Ugadi Saree Festival Blast",
        type: "FESTIVAL",
        note: "25% discount on all silks",
        templateId: template1.id,
        contactListId: list1.id,
        status: "COMPLETED",
        totalRecipients: 15,
        sentCount: 15,
        deliveredCount: 14,
        readCount: 12,
        failedCount: 1,
      },
    });

    for (let i = 0; i < createdContacts.length; i++) {
      const contact = createdContacts[i];
      const isFailed = i === 14;
      const isRead = i < 12;

      await prisma.messageLog.create({
        data: {
          campaignId: camp1.id,
          contactId: contact.id,
          phone: contact.phone,
          recipientName: contact.name,
          waMessageId: `wamid.HBgL${Date.now()}_${i}`,
          status: isFailed ? "FAILED" : isRead ? "READ" : "DELIVERED",
          errorCode: isFailed ? "131026" : undefined,
          errorMessage: isFailed ? "Recipient phone number unreachable" : undefined,
          sentAt: new Date(Date.now() - 86400000 * 2),
          deliveredAt: isFailed ? null : new Date(Date.now() - 86400000 * 2 + 1000),
          readAt: isRead ? new Date(Date.now() - 86400000 * 2 + 5000) : null,
        },
      });
    }
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
