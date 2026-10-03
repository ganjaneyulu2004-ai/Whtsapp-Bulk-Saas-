import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const formData = await req.formData();
    const plan = formData.get("plan") as string;
    const amountStr = formData.get("amount") as string;
    const utrNumber = formData.get("utrNumber") as string;
    const payerName = formData.get("payerName") as string;
    const businessName = formData.get("businessName") as string;
    const payerEmail = formData.get("payerEmail") as string;
    const payerMobile = formData.get("payerMobile") as string;
    const payerGst = formData.get("payerGst") as string;
    const payerCity = formData.get("payerCity") as string;
    const screenshot = formData.get("screenshot") as File | null;

    if (!plan?.trim()) {
      return NextResponse.json({ error: "Please select a plan" }, { status: 400 });
    }
    if (!amountStr || isNaN(parseFloat(amountStr))) {
      return NextResponse.json({ error: "Invalid plan amount" }, { status: 400 });
    }
    if (!utrNumber?.trim()) {
      return NextResponse.json({ error: "UTR / Transaction ID is required" }, { status: 400 });
    }

    const cleanUtr = utrNumber.trim().toUpperCase();
    if (cleanUtr.length < 6 || cleanUtr.length > 20) {
      return NextResponse.json({ error: "Please enter a valid 12-digit UTR number" }, { status: 400 });
    }

    // Check UTR uniqueness across subscriptions
    const existingUtr = await prisma.subscription.findUnique({
      where: { utrNumber: cleanUtr },
    });

    if (existingUtr && existingUtr.userId !== session.user.id) {
      return NextResponse.json(
        { error: "This UTR number has already been submitted by another user." },
        { status: 400 }
      );
    }

    if (!screenshot) {
      return NextResponse.json({ error: "Payment screenshot is required" }, { status: 400 });
    }

    // Validate screenshot size (max 5 MB)
    if (screenshot.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Screenshot must be less than 5 MB" }, { status: 400 });
    }

    // Save screenshot to /public/uploads/payments
    const bytes = await screenshot.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "payments");
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(screenshot.name) || ".png";
    const safeFilename = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, safeFilename);

    await fs.writeFile(filePath, buffer);
    const screenshotPath = `/uploads/payments/${safeFilename}`;

    const amount = parseFloat(amountStr);

    // Create or update subscription for this user
    let subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["AWAITING_PAYMENT", "PENDING_VERIFICATION", "REJECTED", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (subscription) {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan,
          amount,
          utrNumber: cleanUtr,
          screenshotPath,
          payerName: payerName?.trim() || session.user.name || "Customer",
          businessName: businessName?.trim() || session.user.businessName || null,
          payerEmail: payerEmail?.trim() || null,
          payerMobile: payerMobile?.trim() || session.user.mobile || null,
          payerGst: payerGst?.trim() || null,
          payerCity: payerCity?.trim() || null,
          status: "PENDING_VERIFICATION",
          submittedAt: new Date(),
          adminNote: null,
        },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan,
          amount,
          utrNumber: cleanUtr,
          screenshotPath,
          payerName: payerName?.trim() || session.user.name || "Customer",
          businessName: businessName?.trim() || session.user.businessName || null,
          payerEmail: payerEmail?.trim() || null,
          payerMobile: payerMobile?.trim() || session.user.mobile || null,
          payerGst: payerGst?.trim() || null,
          payerCity: payerCity?.trim() || null,
          status: "PENDING_VERIFICATION",
          submittedAt: new Date(),
        },
      });
    }

    // Optional admin WhatsApp notification
    notifyAdminNewPayment(session.user.name || "User", amount, cleanUtr).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Payment submitted successfully!",
      subscription,
    });
  } catch (err: any) {
    console.error("Subscription submit error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit payment" }, { status: 500 });
  }
}

async function notifyAdminNewPayment(userName: string, amount: number, utr: string) {
  const adminPhone = process.env.ADMIN_NOTIFY_PHONE;
  const token = process.env.WA_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID;
  const version = process.env.WA_API_VERSION || "v26.0";

  if (!adminPhone || !adminPhone.trim() || !token || !phoneId) {
    return;
  }

  try {
    const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
    const text = `New payment: ${userName}, ₹${amount}, UTR ${utr}`;

    await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { body: text },
      }),
    });
  } catch (e) {
    // Silently ignore notification errors as per requirements
  }
}
