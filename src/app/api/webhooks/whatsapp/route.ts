import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { processCampaignSending } from "@/lib/queue";

import { setLastWebhookReceivedAt, recordMessageDeliveryStatus } from "@/lib/webhook-state";

function verifyMetaSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const expectedHash = signatureHeader.substring(7);
  const actualHash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf-8")
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(actualHash, "hex"));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WA_VERIFY_TOKEN || process.env.WA_WEBHOOK_VERIFY_TOKEN || "offerblast_verify_token_123";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("✅ Meta Webhook handshake verified successfully!");
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("❌ Webhook verification failed. Token mismatch.");
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.META_APP_SECRET;

    if (appSecret && appSecret.trim() !== "" && appSecret !== "from_meta_app_settings_basic") {
      const isValid = verifyMetaSignature(rawBody, signature, appSecret);
      if (!isValid) {
        console.warn("⚠️ Invalid Webhook X-Hub-Signature-256 from Meta!");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    setLastWebhookReceivedAt(new Date());

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("📥 META WEBHOOK EVENT:", JSON.stringify(body));

    processWebhookPayload(body).catch((err) => {
      console.error("Error processing background webhook payload:", err);
    });

    return NextResponse.json({ status: "RECEIVED" }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook endpoint exception:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

async function processWebhookPayload(body: any) {
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const field = changes?.field;

  // Handle Meta Template Approval Events (message_template_status_update)
  if (field === "message_template_status_update" || value?.event) {
    const templateName = value?.message_template_name || value?.template_name;
    const eventStatus = (value?.event || value?.status || "").toUpperCase(); // APPROVED, REJECTED

    if (templateName && (eventStatus === "APPROVED" || eventStatus === "REJECTED")) {
      console.log(`✨ Template Webhook Notification: ${templateName} -> ${eventStatus}`);
      
      // Update template status in DB
      const updatedTemplates = await prisma.template.updateMany({
        where: { name: templateName },
        data: {
          status: eventStatus,
          rejectionReason: value?.reason || null,
        },
      });

      // If APPROVED, auto-start all campaigns waiting for approval!
      if (eventStatus === "APPROVED") {
        const approvedTemplates = await prisma.template.findMany({
          where: { name: templateName },
          select: { id: true },
        });
        const templateIds = approvedTemplates.map((t) => t.id);

        const waitingCampaigns = await prisma.campaign.findMany({
          where: {
            templateId: { in: templateIds },
            status: "WAITING_APPROVAL",
          },
        });

        console.log(`🚀 Auto-starting ${waitingCampaigns.length} campaigns waiting for approval...`);
        for (const camp of waitingCampaigns) {
          await prisma.campaign.update({
            where: { id: camp.id },
            data: { status: "SENDING" },
          });
          processCampaignSending(camp.id).catch((e) => console.error(e));
        }
      }
    }
    return;
  }

  if (!value) return;

  const contactsMap = new Map<string, string>();
  if (value.contacts && Array.isArray(value.contacts)) {
    for (const c of value.contacts) {
      if (c.wa_id) {
        contactsMap.set(c.wa_id, c.profile?.name || "Customer");
      }
    }
  }

  // 1. Process Message Status Updates (sent, delivered, read, failed)
  if (value.statuses && Array.isArray(value.statuses)) {
    for (const statusObj of value.statuses) {
      const waMsgId = statusObj.id;
      const statusType = (statusObj.status || "").toLowerCase();
      const timestamp = statusObj.timestamp
        ? new Date(parseInt(statusObj.timestamp, 10) * 1000)
        : new Date();

      const errObj = statusObj.errors?.[0];
      const errCode = errObj?.code ? String(errObj.code) : undefined;
      const errMsg = errObj?.error_data?.details || errObj?.title || errObj?.message || undefined;

      recordMessageDeliveryStatus({
        waMessageId: waMsgId,
        recipientId: statusObj.recipient_id || "",
        status: statusType as any,
        errorCode: errCode,
        errorMessage: errMsg,
        timestamp,
      });

      const log = await prisma.messageLog.findUnique({
        where: { waMessageId: waMsgId },
      });

      if (log) {
        const updateData: any = {};
        if (statusType === "sent") {
          updateData.sentAt = log.sentAt || timestamp;
          if (log.status === "PENDING") {
            updateData.status = "SENT";
          }
        } else if (statusType === "delivered") {
          if (!log.sentAt) updateData.sentAt = timestamp;
          updateData.deliveredAt = log.deliveredAt || timestamp;
          // Status only moves forward (sent -> delivered -> read); late delivered must never overwrite read
          if (log.status !== "READ") {
            updateData.status = "DELIVERED";
          }
        } else if (statusType === "read") {
          if (!log.deliveredAt) updateData.deliveredAt = timestamp;
          updateData.readAt = log.readAt || timestamp;
          updateData.status = "READ";
        } else if (statusType === "failed") {
          if (log.status !== "READ" && log.status !== "DELIVERED") {
            updateData.status = "FAILED";
          }
          const errObj = statusObj.errors?.[0];
          updateData.errorCode = String(errObj?.code || "UNKNOWN");
          updateData.errorMessage =
            errObj?.error_data?.details || errObj?.title || errObj?.message || "Message delivery failed";
        }


        if (Object.keys(updateData).length > 0) {
          await prisma.messageLog.update({
            where: { id: log.id },
            data: updateData,
          });

          await recalculateCampaignCounters(log.campaignId);
        }
      }
    }
  }

  // 2. Process Incoming Customer Messages & Opt-Out Keywords ("STOP", "UNSUBSCRIBE", "ఆపు")
  if (value.messages && Array.isArray(value.messages)) {
    for (const msg of value.messages) {
      const fromPhone = (msg.from || "").replace(/[^0-9]/g, "");
      const customerName = contactsMap.get(msg.from) || "Customer";
      const textBody = (msg.text?.body || msg.button?.text || "").trim();
      const waMsgId = msg.id;
      const msgTimestamp = msg.timestamp
        ? new Date(parseInt(msg.timestamp, 10) * 1000)
        : new Date();

      try {
        await prisma.incomingMessage.upsert({
          where: { waMessageId: waMsgId || undefined },
          update: { messageText: textBody },
          create: {
            fromPhone,
            customerName,
            messageText: textBody,
            waMessageId: waMsgId,
            timestamp: msgTimestamp,
          },
        });
      } catch (e) {
        console.error("Failed to save incoming message:", e);
      }

      const upperText = textBody.toUpperCase();
      if (upperText === "STOP" || upperText === "UNSUBSCRIBE" || upperText.includes("ఆపు")) {
        await prisma.contact.updateMany({
          where: {
            phone: {
              contains: fromPhone.slice(-10),
            },
          },
          data: { optedOut: true },
        });

        console.log(`🚫 Opted-out contact for phone +${fromPhone}`);
      }
    }
  }
}

async function recalculateCampaignCounters(campaignId: string) {
  try {
    const logs = await prisma.messageLog.findMany({
      where: { campaignId },
      select: { status: true },
    });

    let sentCount = 0;
    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;

    for (const l of logs) {
      if (l.status === "SENT") sentCount++;
      if (l.status === "DELIVERED") {
        sentCount++;
        deliveredCount++;
      }
      if (l.status === "READ") {
        sentCount++;
        deliveredCount++;
        readCount++;
      }
      if (l.status === "FAILED") failedCount++;
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount,
        deliveredCount,
        readCount,
        failedCount,
      },
    });
  } catch (err) {
    console.error("Error recalculating campaign counters:", err);
  }
}
