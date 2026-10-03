import { NextResponse } from "next/server";
import { SUBSCRIPTION_PLANS, META_NOTE } from "@/config/plans";

export async function GET() {
  const showTest = process.env.SHOW_TEST_PLAN === "true";
  const plans = SUBSCRIPTION_PLANS.filter((p) => !p.isTest || showTest);

  return NextResponse.json({
    plans,
    upiId: process.env.UPI_ID || "ibrainlabs@upi",
    payeeName: process.env.UPI_PAYEE_NAME || "iBrainLabs",
    paymentPhone: process.env.PAYMENT_PHONE || "+919876543210",
    metaNote: META_NOTE,
  });
}
