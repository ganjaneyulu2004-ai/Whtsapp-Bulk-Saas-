import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export async function initializeDatabase() {
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "username" TEXT UNIQUE NOT NULL,
      "email" TEXT UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "businessName" TEXT,
      "mobile" TEXT,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "Subscription" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "plan" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
      "utrNumber" TEXT UNIQUE,
      "screenshotPath" TEXT,
      "payerName" TEXT,
      "businessName" TEXT,
      "payerEmail" TEXT,
      "payerMobile" TEXT,
      "payerGst" TEXT,
      "payerCity" TEXT,
      "adminNote" TEXT,
      "submittedAt" TIMESTAMP(3),
      "approvedAt" TIMESTAMP(3),
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "Business" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'Retail Shop',
      "logoUrl" TEXT,
      "phone" TEXT,
      "address" TEXT,
      "website" TEXT,
      "defaultBookingLink" TEXT,
      "currency" TEXT NOT NULL DEFAULT 'INR',
      "perMessageCost" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
      "language" TEXT NOT NULL DEFAULT 'en',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "WhatsAppConfig" (
      "id" TEXT PRIMARY KEY,
      "businessId" TEXT UNIQUE NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
      "waToken" TEXT,
      "waPhoneNumberId" TEXT,
      "waBusinessAccountId" TEXT,
      "waApiVersion" TEXT NOT NULL DEFAULT 'v26.0',
      "metaAppId" TEXT,
      "messagingLimitTier" TEXT NOT NULL DEFAULT 'TIER_250',
      "isConnected" BOOLEAN NOT NULL DEFAULT false,
      "connectionMethod" TEXT DEFAULT 'MANUAL',
      "displayPhoneNumber" TEXT,
      "verifiedName" TEXT,
      "qualityRating" TEXT,
      "embeddedSignupAt" TIMESTAMP(3),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "Template" (
      "id" TEXT PRIMARY KEY,
      "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'MARKETING',
      "language" TEXT NOT NULL DEFAULT 'en',
      "headerType" TEXT NOT NULL DEFAULT 'IMAGE',
      "headerMediaUrl" TEXT,
      "headerHandle" TEXT,
      "bodyText" TEXT NOT NULL,
      "footerText" TEXT,
      "buttonsJson" TEXT,
      "metaTemplateId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'APPROVED',
      "rejectionReason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "ContactList" (
      "id" TEXT PRIMARY KEY,
      "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "contactCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "Contact" (
      "id" TEXT PRIMARY KEY,
      "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
      "listId" TEXT REFERENCES "ContactList"("id") ON DELETE SET NULL,
      "name" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "optedOut" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "Contact_businessId_phone_key" ON "Contact"("businessId", "phone");`,

    `CREATE TABLE IF NOT EXISTS "Campaign" (
      "id" TEXT PRIMARY KEY,
      "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "customType" TEXT,
      "note" TEXT,
      "businessName" TEXT,
      "bookingLink" TEXT,
      "alwaysUseTemplate" BOOLEAN NOT NULL DEFAULT true,
      "templateId" TEXT NOT NULL REFERENCES "Template"("id"),
      "contactListId" TEXT REFERENCES "ContactList"("id"),
      "scheduledAt" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "totalRecipients" INTEGER NOT NULL DEFAULT 0,
      "sentCount" INTEGER NOT NULL DEFAULT 0,
      "deliveredCount" INTEGER NOT NULL DEFAULT 0,
      "readCount" INTEGER NOT NULL DEFAULT 0,
      "failedCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "MessageLog" (
      "id" TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL REFERENCES "Campaign"("id") ON DELETE CASCADE,
      "contactId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL,
      "phone" TEXT NOT NULL,
      "recipientName" TEXT NOT NULL DEFAULT 'Customer',
      "waMessageId" TEXT UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "errorCode" TEXT,
      "errorMessage" TEXT,
      "sentOfferText" TEXT,
      "sentBusinessName" TEXT,
      "sentBookingLink" TEXT,
      "parametersJson" TEXT,
      "sentAt" TIMESTAMP(3),
      "deliveredAt" TIMESTAMP(3),
      "readAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "IncomingMessage" (
      "id" TEXT PRIMARY KEY,
      "businessId" TEXT,
      "fromPhone" TEXT NOT NULL,
      "customerName" TEXT,
      "messageText" TEXT NOT NULL,
      "waMessageId" TEXT UNIQUE,
      "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    // Auto-migrate Business table for per-message API card billing
    `ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "apiCardLinked" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "apiCardLast4" TEXT;`,
    `ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "apiCardBrand" TEXT;`,
    `ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "apiCardToken" TEXT;`,
    `ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "unbilledApiSpend" DOUBLE PRECISION DEFAULT 0.0;`,
    `ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingThreshold" DOUBLE PRECISION DEFAULT 500.0;`,
    `ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "totalApiCharged" DOUBLE PRECISION DEFAULT 0.0;`,
  ];

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: any) {
      console.warn("DDL execution warning:", e?.message || e);
    }
  }

  // Seed default admin and demo business if missing
  const adminUsername = process.env.ADMIN_USERNAME || "ADMIN_IbrainTest";
  const adminPassword = process.env.ADMIN_PASSWORD || "ADMIN_IbrainTest123";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    create: {
      username: adminUsername,
      name: "iBrainLabs Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      mobile: "919390487233",
    },
  });

  const business = await prisma.business.upsert({
    where: { id: "demo-business-id" },
    update: {
      name: "iBrainLabs",
      phone: "+91 93904 84762",
    },
    create: {
      id: "demo-business-id",
      userId: admin.id,
      name: "iBrainLabs",
      category: "WhatsApp Marketing & Technology",
      phone: "+91 93904 84762",
      perMessageCost: 0.80,
      language: "en",
    },
  });

  const existingWa = await prisma.whatsAppConfig.findUnique({
    where: { businessId: business.id },
  });
  if (!existingWa) {
    await prisma.whatsAppConfig.create({
      data: {
        businessId: business.id,
        waToken: process.env.WA_TOKEN || null,
        waPhoneNumberId: process.env.WA_PHONE_NUMBER_ID || "1443849605471143",
        waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || "2367270804076581",
        waApiVersion: process.env.WA_API_VERSION || "v26.0",
        metaAppId: process.env.META_APP_ID || "1019114041212914",
        messagingLimitTier: "TIER_250",
        isConnected: true,
      },
    });
  }

  // Seed VIP Client Account (Platform Fees Exempt)
  const vipUsername = "VIP_Client";
  const vipPassword = "VIP_Client123";
  const vipPasswordHash = await bcrypt.hash(vipPassword, 10);

  const vipUser = await prisma.user.upsert({
    where: { username: vipUsername },
    update: {
      passwordHash: vipPasswordHash,
      role: "USER",
    },
    create: {
      username: vipUsername,
      name: "VIP Client (Exempt)",
      businessName: "VIP Retail Partner",
      role: "USER",
      passwordHash: vipPasswordHash,
      mobile: "919390487233",
    },
  });

  const vipBusiness = await prisma.business.upsert({
    where: { id: "vip-client-business-id" },
    update: {
      name: "VIP Retail Partner",
      userId: vipUser.id,
    },
    create: {
      id: "vip-client-business-id",
      userId: vipUser.id,
      name: "VIP Retail Partner",
      category: "Retail Showcase",
      phone: "+91 93904 84762",
      perMessageCost: 0.80,
      language: "en",
    },
  });

  await prisma.whatsAppConfig.upsert({
    where: { businessId: vipBusiness.id },
    update: {
      isConnected: false,
      connectionMethod: "PENDING_ACTIVATION",
      displayPhoneNumber: null,
      waPhoneNumberId: null,
      waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || "2367270804076581",
      waToken: process.env.WA_TOKEN || null,
      qualityRating: "High (Green)",
      messagingLimitTier: "TIER_250",
    },
    create: {
      businessId: vipBusiness.id,
      isConnected: false,
      connectionMethod: "PENDING_ACTIVATION",
      displayPhoneNumber: null,
      waPhoneNumberId: null,
      waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || "2367270804076581",
      waToken: process.env.WA_TOKEN || null,
      qualityRating: "High (Green)",
      messagingLimitTier: "TIER_250",
    },
  });

  const existingVipSub = await prisma.subscription.findFirst({
    where: { userId: vipUser.id },
  });
  const now = new Date();
  const tenYearsLater = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  if (existingVipSub) {
    await prisma.subscription.update({
      where: { id: existingVipSub.id },
      data: {
        plan: "VIP Pro (Platform Fee Exempt)",
        status: "ACTIVE",
        endDate: tenYearsLater,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: vipUser.id,
        plan: "VIP Pro (Platform Fee Exempt)",
        amount: 0,
        status: "ACTIVE",
        startDate: now,
        endDate: tenYearsLater,
        adminNote: "VIP Partner Lifetime Free Platform Access",
      },
    });
  }

  return { success: true, message: "Database schema and default business initialized successfully!" };
}
