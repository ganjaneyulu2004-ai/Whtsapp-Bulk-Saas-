import { prisma } from "./prisma";
import { sendWhatsAppTemplateMessage, uploadMediaToMeta, formatDirectOfferMessage } from "./whatsapp";
import { countTemplateBodyVariables } from "./template-service";
import { getGenericFallbackForVariable } from "./template-variables";
import { decryptToken } from "./encryption";
import { getMetaGraphVersion } from "./meta-config";

const activeCampaignJobs = new Set<string>();

/**
 * High-precision rate limiter strictly enforcing Meta's 80 msg/sec per-WABA limit.
 * Uses a 1000ms sliding timestamp window to guarantee throughput never breaches 80 req/s.
 */
export class MetaRateLimiter {
  private maxPerSecond: number;
  private timestamps: number[] = [];

  constructor(maxPerSecond: number = 80) {
    this.maxPerSecond = maxPerSecond;
  }

  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      // Retain only timestamps from the last 1000ms
      this.timestamps = this.timestamps.filter((t) => now - t < 1000);

      if (this.timestamps.length < this.maxPerSecond) {
        this.timestamps.push(now);
        return;
      }

      const oldest = this.timestamps[0];
      const waitMs = Math.max(5, 1000 - (now - oldest) + 2);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

const phoneRateLimiters = new Map<string, MetaRateLimiter>();
export function getPhoneRateLimiter(phoneId?: string | null): MetaRateLimiter {
  const key = phoneId?.trim() || "default";
  let limiter = phoneRateLimiters.get(key);
  if (!limiter) {
    limiter = new MetaRateLimiter(80);
    phoneRateLimiters.set(key, limiter);
  }
  return limiter;
}

/**
 * Returns configurable concurrency for campaign message dispatching (default: 5, max: 20).
 */
export function getCampaignConcurrency(): number {
  const envVal = process.env.CAMPAIGN_SEND_CONCURRENCY || process.env.CAMPAIGN_CONCURRENCY || "5";
  const parsed = parseInt(envVal, 10);
  return Math.min(20, Math.max(1, isNaN(parsed) ? 5 : parsed));
}

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

    const currentCampaign = campaign;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" },
    });

    const isApproved = currentCampaign.template.status === "APPROVED";
    const targetStatuses = isApproved ? ["PENDING", "WAITING_APPROVAL"] : ["PENDING"];

    const pendingLogs = await prisma.messageLog.findMany({
      where: { campaignId, status: { in: targetStatuses } },
      include: { contact: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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

    const waConfig: any = currentCampaign.business.whatsappConfig || {};
    const targetTemplateName = currentCampaign.template.name;
    const targetLanguage = currentCampaign.template.language || "en_US";
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Resolve effective header image: campaign override first, then template's default headerImageUrl/headerMediaUrl
    const effectiveHeaderImageUrl =
      currentCampaign.headerImageUrl ||
      currentCampaign.template.headerImageUrl ||
      currentCampaign.template.headerMediaUrl ||
      undefined;

    // Only reuse numeric WhatsApp Media ID if no public link is available and handle is a numeric Media ID
    const isNumericMediaId = Boolean(
      currentCampaign.template.headerHandle && /^\d+$/.test(currentCampaign.template.headerHandle.trim())
    );
    let campaignMediaId: string | undefined =
      !currentCampaign.headerImageUrl && isNumericMediaId
        ? currentCampaign.template.headerHandle || undefined
        : undefined;

    if (
      !campaignMediaId &&
      effectiveHeaderImageUrl &&
      effectiveHeaderImageUrl.startsWith("data:image/")
    ) {
      try {
        const uploadRes = await uploadMediaToMeta(
          {
            waToken: decryptToken(waConfig.waToken) || undefined,
            waPhoneNumberId: waConfig.waPhoneNumberId || undefined,
            waApiVersion: getMetaGraphVersion(waConfig.waApiVersion),
          },
          effectiveHeaderImageUrl
        );
        if (uploadRes.success && uploadRes.mediaId) {
          campaignMediaId = uploadRes.mediaId;
        } else {
          console.error("Failed to upload campaign poster to Meta:", uploadRes.error);
        }
      } catch (err) {
        console.error("Exception during campaign poster upload to Meta:", err);
      }
    }

    let hasWaitingApprovalOutsideWindow = false;
    let isPausedOrCancelled = false;
    let nextLogIndex = 0;
    const concurrency = getCampaignConcurrency();
    const rateLimiter = getPhoneRateLimiter(waConfig.waPhoneNumberId);

    async function processSingleLog(log: typeof pendingLogs[0]) {
      try {
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
          return;
        }

        // Check 24-hour customer service window
        const cleanDigits = log.phone.replace(/[^0-9]/g, "");
        const incomingMsg = await prisma.incomingMessage.findFirst({
          where: {
            businessId: currentCampaign.businessId,
            fromPhone: { contains: cleanDigits.slice(-10) },
            timestamp: { gte: twentyFourHoursAgo },
          },
          orderBy: { timestamp: "desc" },
        });

        const is24HourWindow = !!incomingMsg;
        const alwaysUseTemplate = currentCampaign.alwaysUseTemplate !== false;
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
          return;
        }

        const recipientName = log.recipientName?.trim() || "Customer";
        const bName = currentCampaign.businessName?.trim() || currentCampaign.business.name || "OneAmple";
        const bLink = currentCampaign.bookingLink?.trim() || "";
        const baseOffer = currentCampaign.note?.trim() || "Special Offer for you today!";
        const offerWithBooking = bLink && !baseOffer.includes(bLink) ? `${baseOffer} 👉 ${bLink}` : baseOffer;

        const cleanOffer = offerWithBooking
          .replace(/[\r\n\t]/g, " ")
          .replace(/ {5,}/g, "    ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 300);

        const directCaption = formatDirectOfferMessage(cleanOffer, recipientName, bName, bLink);
        const bodyVarCount = countTemplateBodyVariables(currentCampaign.template.bodyText);

        // Resolve custom per-variable parameters when configured in Create Campaign Step 2
        let customBodyParameters: string[] | undefined = undefined;
        if (bodyVarCount > 0) {
          let rawList: string[] = [];
          if (currentCampaign.bodyVariablesJson) {
            try {
              const parsedVars = JSON.parse(currentCampaign.bodyVariablesJson);
              if (Array.isArray(parsedVars)) {
                rawList = parsedVars.map((v) => String(v || ""));
              } else if (parsedVars && typeof parsedVars === "object") {
                rawList = Array.from({ length: bodyVarCount }, (_, idx) => String(parsedVars[String(idx + 1)] || ""));
              }
            } catch { }
          }

          // Final safety net: ensure every slot 1..bodyVarCount has a non-empty, unique value
          const used = new Set<string>();
          for (const r of rawList) {
            if (r && r.trim() && r.trim() !== "__CONTACT_NAME__") {
              used.add(r.trim().toLowerCase());
            }
          }
          customBodyParameters = Array.from({ length: bodyVarCount }, (_, idx) => {
            const num = idx + 1;
            const raw = rawList[idx];
            if (num === 1 && (raw === "__CONTACT_NAME__" || !raw || raw.trim() === "")) {
              return recipientName;
            }
            if (raw && raw.trim() !== "") {
              return raw === "__CONTACT_NAME__" ? recipientName : raw.trim();
            }
            // Safety net fallback
            const val = getGenericFallbackForVariable(
              num,
              currentCampaign.template.bodyText,
              undefined,
              {
                name: bName,
                bookingLink: bLink,
                recipientName,
                servicesAndPricing: currentCampaign.business.servicesAndPricing,
                businessDescription: currentCampaign.business.businessDescription,
                category: currentCampaign.business.category,
              },
              used
            );
            used.add(val.toLowerCase());
            return val;
          });
        }

        const paramsJson = JSON.stringify({
          recipientName,
          offerText: cleanOffer,
          businessName: bName,
          bookingLink: bLink || null,
          customBodyParameters: customBodyParameters || null,
          mode: useDirect24h ? "direct_24h" : "template",
          templateName: targetTemplateName,
        });

        // Acquire rate limiter ticket ensuring max 80 requests/sec to Meta
        await rateLimiter.acquire();

        const result = await sendWhatsAppTemplateMessage(
          {
            waToken: decryptToken(waConfig.waToken) || undefined,
            waPhoneNumberId: waConfig.waPhoneNumberId || undefined,
            waApiVersion: getMetaGraphVersion(waConfig.waApiVersion),
          },
          log.phone,
          recipientName,
          targetTemplateName,
          targetLanguage,
          effectiveHeaderImageUrl,
          {
            offerText: baseOffer,
            businessName: bName,
            bookingLink: bLink || undefined,
            is24HourWindow: useDirect24h,
            mediaId: campaignMediaId,
            freeFormText: directCaption,
            bodyVarCount,
            customBodyParameters,
            headerType: currentCampaign.template.headerType,
            headerText: currentCampaign.template.headerText || undefined,
            isTest: Boolean(currentCampaign.isTest),
          }
        );

        if (result.success) {
          const now = new Date();
          const isTestCampaign = Boolean(currentCampaign.isTest);

          // Mark SENT first
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

          // For load-test / dry-run campaigns, simulate successful webhook delivery immediately
          if (isTestCampaign) {
            const deliveredAt = new Date();
            await prisma.messageLog.update({
              where: { id: log.id },
              data: {
                status: "DELIVERED",
                deliveredAt,
              },
            });
            await prisma.campaign.update({
              where: { id: campaignId },
              data: {
                deliveredCount: { increment: 1 },
              },
            });
          }
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
      } catch (err: any) {
        console.error(`Error processing message log ${log.id}:`, err);
        await prisma.messageLog.update({
          where: { id: log.id },
          data: {
            status: "FAILED",
            errorCode: "INTERNAL_ERR",
            errorMessage: err?.message || "Internal sending error",
          },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }
    }

    // Concurrent worker pool: pulls logs sequentially (order preserved, zero duplicate sends)
    async function worker() {
      while (true) {
        if (isPausedOrCancelled) break;

        const currentCamp = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        });
        if (currentCamp?.status === "PAUSED" || currentCamp?.status === "CANCELLED") {
          isPausedOrCancelled = true;
          break;
        }

        const logIndex = nextLogIndex++;
        if (logIndex >= pendingLogs.length) break;

        const log = pendingLogs[logIndex];
        await processSingleLog(log);
      }
    }

    const workerCount = Math.min(concurrency, pendingLogs.length);
    const workerPromises = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workerPromises);

    const remainingPending = await prisma.messageLog.count({
      where: { campaignId, status: "PENDING" },
    });

    if (remainingPending > 0 && !isPausedOrCancelled) {
      setTimeout(() => {
        activeCampaignJobs.delete(campaignId);
        processCampaignSending(campaignId);
      }, 50);
    } else {
      if (!isPausedOrCancelled) {
        const finalStatus = hasWaitingApprovalOutsideWindow ? "WAITING_APPROVAL" : "COMPLETED";
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: finalStatus },
        });
      }
      activeCampaignJobs.delete(campaignId);
    }
  } catch (err) {
    console.error(`Error processing sending for campaign ${campaignId}:`, err);
    activeCampaignJobs.delete(campaignId);
  }
}

/**
 * Resumes campaigns stuck in SENDING status after server restarts.
 * Processes PENDING logs only, guaranteeing zero duplicate sends.
 */
export async function resumeInterruptedCampaigns(): Promise<number> {
  try {
    const interrupted = await prisma.campaign.findMany({
      where: { status: "SENDING" },
      select: { id: true, name: true, isTest: true },
    });

    if (interrupted.length === 0) return 0;

    console.log(`[Queue Recovery] Found ${interrupted.length} campaign(s) in SENDING status upon startup.`);
    let resumedCount = 0;

    for (const c of interrupted) {
      const pendingCount = await prisma.messageLog.count({
        where: { campaignId: c.id, status: { in: ["PENDING", "WAITING_APPROVAL"] } },
      });

      if (pendingCount > 0) {
        console.log(`[Queue Recovery] Resuming campaign "${c.name}" (${c.id}) with ${pendingCount} remaining pending logs...`);
        resumedCount++;
        processCampaignSending(c.id).catch((err) => {
          console.error(`[Queue Recovery] Error resuming campaign ${c.id}:`, err);
        });
      } else {
        await prisma.campaign.update({
          where: { id: c.id },
          data: { status: "COMPLETED" },
        });
      }
    }

    return resumedCount;
  } catch (err) {
    console.error("[Queue Recovery] Failed to check for interrupted campaigns:", err);
    return 0;
  }
}
