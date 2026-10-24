import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { razorpay } from "@/lib/razorpay";
import { SUBSCRIPTION_PLANS, CREDIT_TOPUP_PACKS } from "@/config/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, itemType } = body; // itemType: "PLAN" | "TOPUP"

    let amount = 0;
    let name = "";

    if (itemType === "TOPUP") {
      const pack = CREDIT_TOPUP_PACKS.find((p) => p.id === itemId);
      if (!pack) {
        return NextResponse.json({ error: "Invalid top-up pack selected." }, { status: 400 });
      }
      amount = pack.price;
      name = pack.name;
    } else {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === itemId);
      if (!plan) {
        return NextResponse.json({ error: "Invalid subscription plan selected." }, { status: 400 });
      }
      amount = plan.price;
      name = plan.name;
    }

    // Razorpay amount is in paise (1 INR = 100 paise)
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now().toString().slice(-8)}_${session.user.id.slice(0, 4)}`,
      notes: {
        userId: session.user.id,
        username: session.user.username || "",
        itemId,
        itemType: itemType || "PLAN",
        itemName: name,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_live_Tm5fsJVpQaPb5t",
      notes: order.notes,
    });
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create Razorpay order." },
      { status: 500 }
    );
  }
}
