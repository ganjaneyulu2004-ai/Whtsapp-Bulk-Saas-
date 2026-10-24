import { NextResponse } from "next/server";
import { SUBSCRIPTION_PLANS, CREDIT_TOPUP_PACKS, META_NOTE } from "@/config/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const showTest = process.env.SHOW_TEST_PLAN === "true";
  const plans = SUBSCRIPTION_PLANS.filter((p) => !p.isTest || showTest);

  return NextResponse.json({
    plans,
    topUpPacks: CREDIT_TOPUP_PACKS,
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_live_Tm5fsJVpQaPb5t",
    upiId: process.env.UPI_ID || "9390487233@ybl",
    payeeName: process.env.UPI_PAYEE_NAME || "Ibrain Labs",
    paymentPhone: process.env.PAYMENT_PHONE || "+919390487233",
    metaNote: META_NOTE,
  });
}
