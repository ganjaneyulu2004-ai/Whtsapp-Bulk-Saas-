import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SUBSCRIPTION_PLANS, META_NOTE } from "@/config/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const showTest = process.env.SHOW_TEST_PLAN === "true" && isAdmin;
  const plans = SUBSCRIPTION_PLANS.filter((p) => !p.isTest || showTest);

  return NextResponse.json({
    plans,
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
    upiId: process.env.UPI_ID || "9390487233@ybl",
    payeeName: process.env.UPI_PAYEE_NAME || "OneAmple (iBrainLabs)",
    paymentPhone: process.env.PAYMENT_PHONE || "+919390487233",
    metaNote: META_NOTE,
  });
}
