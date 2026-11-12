import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PLANS } from "@/config/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      itemId,
      payerName,
      payerMobile,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required Razorpay verification parameters." },
        { status: 400 }
      );
    }

    // 1. Verify Razorpay HMAC SHA256 Signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("Razorpay signature mismatch:", { generatedSignature, razorpay_signature });
      return NextResponse.json(
        { error: "Invalid payment signature. Verification failed." },
        { status: 400 }
      );
    }

    // 2. Identify Monthly Subscription Plan
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === itemId);
    const planName = plan ? plan.name : "Growth";
    const planAmount = plan ? plan.price : 2499;

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 3. Upsert Base Monthly Subscription into Database (INSTANT ACTIVE)
    const existingBaseSub = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    let subscription;
    if (existingBaseSub) {
      subscription = await prisma.subscription.update({
        where: { id: existingBaseSub.id },
        data: {
          plan: planName,
          amount: planAmount,
          status: "ACTIVE",
          utrNumber: razorpay_payment_id,
          payerName: payerName || session.user.name || "Customer",
          payerMobile: payerMobile || session.user.mobile || null,
          businessName: session.user.businessName || null,
          adminNote: `Verified via Razorpay Live Gateway (Order: ${razorpay_order_id})`,
          submittedAt: now,
          approvedAt: now,
          startDate: now,
          endDate: thirtyDaysLater,
        },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan: planName,
          amount: planAmount,
          status: "ACTIVE",
          utrNumber: razorpay_payment_id,
          payerName: payerName || session.user.name || "Customer",
          payerMobile: payerMobile || session.user.mobile || null,
          businessName: session.user.businessName || null,
          adminNote: `Verified via Razorpay Live Gateway (Order: ${razorpay_order_id})`,
          submittedAt: now,
          approvedAt: now,
          startDate: now,
          endDate: thirtyDaysLater,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payment successful! Your ${planName} OneAmple subscription is now ACTIVE.`,
      subscription,
      paymentId: razorpay_payment_id,
    });
  } catch (err: any) {
    console.error("Razorpay payment verification error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify payment." },
      { status: 500 }
    );
  }
}
