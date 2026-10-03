import { prisma } from "./prisma";
import { sendWhatsAppTemplateMessage, uploadMediaToMeta, formatDirectOfferMessage } from "./whatsapp";
import { getOrCreateReusableTemplate } from "./template-service";

const activeCampaignJobs = new Set<string>();

export async function processCampaignSending(campaignId: string) {
  if (activeCampaignJobs.has(campaignId)) return;
  activeCampaignJobs.add(campaignId);

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        business: {
          include: { whatsappConfig: true },
        },
      },
    });

    if (!campaign || campaign.status === "COMPLETED" || campaign.status === "PAUSED") {
      activeCampaignJobs.delete(campaignId);
      return;
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" },
    });

    const pendingLogs = await prisma.messageLog.findMany({
      where: { campaignId, status: { in: ["PENDING", "WAITING_APPROVAL"] } },
      include: { contact: true },
      take: 50,
    });

    if (pendingLogs.length === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      });
      activeCampaignJobs.delete(campaignId);
      return;
    }

    const waConfig: any = campaign.business.whatsappConfig || {};
    const targetTemplateName = campaign.template.name;
    const targetLanguage = campaign.template.language || "en_US";
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isApproved = campaign.template.status === "APPROVED";

    // Upload poster once per campaign, reuse the same mediaId for all contacts
    let campaignMediaId: string | undefined = campaign.template.headerHandle || undefined;
    if (!campaignMediaId && campaign.template.headerMediaUrl) {
      try {
        const uploadRes = await uploadMediaToMeta(
          {
            waToken: waConfig.waToken || undefined,
            waPhoneNumberId: waConfig.waPhoneNumberId || undefined,
            waApiVersion: process.env.WA_API_VERSION || waConfig.waApiVersion || "v26.0",
          },
          campaign.template.headerMediaUrl
        );
        if (uploadRes.success && uploadRes.mediaId) {
          campaignMediaId = uploadRes.mediaId;
          await prisma.template.update({
            where: { id: campaign.template.id },
            data: { headerHandle: campaignMediaId },
          });
        } else {
          console.error("Failed to upload campaign poster to Meta:", uploadRes.error);
        }
      } catch (err) {
        console.error("Exception during campaign poster upload to Meta:", err);
      }
    }

    let hasWaitingApprovalOutsideWindow = false;

    for (const log of pendingLogs) {
      const currentCamp = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });
      if (currentCamp?.status === "PAUSED" || currentCamp?.status === "CANCELLED") {
        break;
      }

      if (log.contact?.optedOut) {
        await prisma.messageLog.update({
          where: { id: log.id },
          data: {
            status: "OPT_OUT_EXCLUDED",
            errorMessage: "Recipient opted out (STOP reply)",
          },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
        continue;
      }

      // Check 24-hour customer service window
      const cleanDigits = log.phone.replace(/[^0-9]/g, "");
      const incomingMsg = await prisma.incomingMessage.findFirst({
        where: {
          fromPhone: { contains: cleanDigits.slice(-10) },
          timestamp: { gte: twentyFourHoursAgo },
        },
        orderBy: { timestamp: "desc" },
      });

      const is24HourWindow = !!incomingMsg;
      const alwaysUseTemplate = campaign.alwaysUseTemplate !== false;
      const useDirect24h = is24HourWindow && !alwaysUseTemplate;

      // If outside 24h window and template is not approved yet, put log in WAITING_APPROVAL and skip
      if (!is24HourWindow && !isApproved) {
        hasWaitingApprovalOutsideWindow = true;
        await prisma.messageLog.update({
          where: { id: log.id },
          data: {
            status: "WAITING_APPROVAL",
            errorMessage: `Template ${targetTemplateName} waiting for Meta approval for contacts outside 24h window`,
          },
        });
        continue;
      }

      await new Promise((r) => setTimeout(r, 50));

      const recipientName = log.recipientName?.trim() || "Customer";
      const bName = campaign.businessName?.trim() || campaign.business.name || "iBrainLabs";
      const bLink = campaign.bookingLink?.trim() || "";
      const baseOffer = campaign.note?.trim() || "Special Offer for you today!";
      const offerWithBooking = bLink && !baseOffer.includes(bLink) ? `${baseOffer} 👉 ${bLink}` : baseOffer;

      const cleanOffer = offerWithBooking
        .replace(/[\r\n\t]/g, " ")
        .replace(/ {5,}/g, "    ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 300);

      const directCaption = formatDirectOfferMessage(cleanOffer, recipientName, bName, bLink);

      const paramsJson = JSON.stringify({
        recipientName,
        offerText: cleanOffer,
        businessName: bName,
        bookingLink: bLink || null,
        mode: useDirect24h ? "direct_24h" : "template",
        templateName: targetTemplateName,
      });

      const result = await sendWhatsAppTemplateMessage(
        {
          waToken: waConfig.waToken || undefined,
          waPhoneNumberId: waConfig.waPhoneNumberId || undefined,
          waApiVersion: process.env.WA_API_VERSION || waConfig.waApiVersion || "v26.0",
        },
        log.phone,
        recipientName,
        targetTemplateName,
        targetLanguage,
        campaign.template.headerMediaUrl || undefined,
        {
          offerText: baseOffer,
          businessName: bName,
          bookingLink: bLink || undefined,
          is24HourWindow: useDirect24h,
          mediaId: campaignMediaId,
          freeFormText: directCaption,
        }
      );

      if (result.success) {
        const now = new Date();
        await prisma.messageLog.update({
          where: { id: log.id },
          data: {
            status: "SENT",
            waMessageId: result.waMessageId,
            sentAt: now,
            sentOfferText: cleanOffer,
            sentBusinessName: bName,
            sentBookingLink: bLink || null,
            parametersJson: paramsJson,
            deliveredAt: null,
            readAt: null,
            errorMessage: null,
          },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            sentCount: { increment: 1 },
          },
        });
      } else {
        await prisma.messageLog.update({
          where: { id: log.id },
          data: {
            status: "FAILED",
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            sentOfferText: cleanOffer,
            sentBusinessName: bName,
            sentBookingLink: bLink || null,
            parametersJson: paramsJson,
          },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }
    }

    const remainingPending = await prisma.messageLog.count({
      where: { campaignId, status: "PENDING" },
    });

    if (remainingPending > 0) {
      setTimeout(() => {
        activeCampaignJobs.delete(campaignId);
        processCampaignSending(campaignId);
      }, 100);
    } else {
      const finalStatus = hasWaitingApprovalOutsideWindow ? "WAITING_APPROVAL" : "COMPLETED";
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: finalStatus },
      });
      activeCampaignJobs.delete(campaignId);
    }
  } catch (err) {
    console.error(`Error processing sending for campaign ${campaignId}:`, err);
    activeCampaignJobs.delete(campaignId);
  }
}
