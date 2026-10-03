import { NextResponse } from "next/server";
import { lastWebhookReceivedAt } from "@/lib/webhook-state";

export async function GET() {
  const verifyToken = process.env.WA_VERIFY_TOKEN || process.env.WA_WEBHOOK_VERIFY_TOKEN || "offerblast_verify_token_123";
  
  return NextResponse.json({
    verifyToken,
    lastReceivedAt: lastWebhookReceivedAt ? lastWebhookReceivedAt.toISOString() : null,
    status: lastWebhookReceivedAt ? "ACTIVE" : "PENDING_FIRST_WEBHOOK",
  });
}
