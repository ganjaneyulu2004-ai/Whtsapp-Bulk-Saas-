import { prisma } from "./prisma";
import { decryptToken } from "./encryption";
import { getMetaGraphVersion } from "./meta-config";

export const POSTER_TEMPLATE_NAME = "offer_poster_v1";
export const TEXT_TEMPLATE_NAME = "offer_update_v1";
export const REUSABLE_TEMPLATE_NAME = "offer_update_v1";

/**
 * Counts the highest numbered {{n}} variable placeholder in a template body.
 * Returns 0 if the template body has no variables.
 */
export function countTemplateBodyVariables(bodyText?: string | null): number {
  if (!bodyText) return 0;
  let maxIdx = 0;
  const regex = /\{\{(\d+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(bodyText)) !== null) {
    const idx = parseInt(match[1], 10);
    if (!Number.isNaN(idx) && idx > maxIdx) {
      maxIdx = idx;
    }
  }
  return maxIdx;
}

/**
 * Syncs templates directly from Meta Graph API (`GET /{waba_id}/message_templates`)
 * using ONLY the client business's own WABA ID and access token.
 * Stores templates scoped by `businessId + wabaId + name + language`.
 */
export async function syncClientTemplatesFromMeta(businessId: string): Promise<{
  synced: boolean;
  wabaId: string | null;
  error?: string;
}> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { whatsappConfig: true },
  });

  if (!business) {
    return { synced: false, wabaId: null, error: "Business not found" };
  }

  const config = business.whatsappConfig;
  const token = decryptToken(config?.waToken);
  const wabaId = config?.waBusinessAccountId?.trim() || null;
  const version = getMetaGraphVersion(config?.waApiVersion);

  if (!token || !wabaId) {
    return {
      synced: false,
      wabaId,
      error: "WhatsApp Business Account ID or Access Token is not configured for this client.",
    };
  }

  try {
    console.log(`[Templates Sync] Fetching live templates from Meta for Business ${businessId} (WABA ${wabaId})...`);
    const metaUrl = `https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=100`;
    const res = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaData = await res.json();

    if (!res.ok || !Array.isArray(metaData?.data)) {
      console.warn(`[Templates Sync] Meta API error for WABA ${wabaId}:`, metaData);
      return {
        synced: false,
        wabaId,
        error: metaData?.error?.message || "Failed to fetch templates from Meta",
      };
    }

    const seenKeys = new Set<string>();

    for (const m of metaData.data) {
      const metaStatus = String(m.status || "PENDING").toUpperCase();
      const metaTplId = m.id ? String(m.id) : undefined;
      const tplName = String(m.name || "").trim();
      const tplLang = String(m.language || "en_US").trim();
      if (!tplName) continue;

      seenKeys.add(`${tplName}::${tplLang}`);

      const headerComp = m.components?.find((c: any) => c.type === "HEADER");
      const bodyComp = m.components?.find((c: any) => c.type === "BODY");
      const footerComp = m.components?.find((c: any) => c.type === "FOOTER");

      const headerType = headerComp?.format ? String(headerComp.format).toUpperCase() : "NONE";
      const bodyText = bodyComp?.text || `Template synced from Meta: ${tplName}`;
      const footerText = footerComp?.text || null;

      // Match strictly within (businessId, wabaId, name, language), or claim legacy null-wabaId row for same business
      const existing = await prisma.template.findFirst({
        where: {
          businessId,
          name: tplName,
          language: tplLang,
          OR: [{ wabaId }, { wabaId: null }],
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        const preservedImageUrl = existing.headerImageUrl || existing.headerMediaUrl || null;
        await prisma.template.update({
          where: { id: existing.id },
          data: {
            wabaId,
            category: m.category || existing.category,
            language: tplLang,
            headerType,
            headerImageUrl: preservedImageUrl,
            bodyText,
            footerText,
            status: metaStatus,
            metaTemplateId: metaTplId || existing.metaTemplateId,
            rejectionReason: m.rejected_reason || null,
          },
        });
      } else {
        await prisma.template.create({
          data: {
            businessId,
            wabaId,
            name: tplName,
            category: m.category || "MARKETING",
            language: tplLang,
            headerType,
            bodyText,
            footerText,
            metaTemplateId: metaTplId || `meta_${Date.now()}`,
            status: metaStatus,
            rejectionReason: m.rejected_reason || null,
          },
        });
      }
    }

    // Any stale template previously stored under this (businessId, wabaId) that is no longer in Meta
    // cannot be sent cleanly — mark it non-APPROVED unless present in live Meta response
    const dbForWaba = await prisma.template.findMany({
      where: { businessId, wabaId, status: "APPROVED" },
      select: { id: true, name: true, language: true },
    });
    const staleIds = dbForWaba
      .filter((t) => !seenKeys.has(`${t.name}::${t.language}`))
      .map((t) => t.id);

    if (staleIds.length > 0) {
      await prisma.template.updateMany({
        where: { id: { in: staleIds } },
        data: { status: "NOT_IN_WABA" },
      });
    }

    return { synced: true, wabaId };
  } catch (err: any) {
    console.error(`[Templates Sync] Exception for business ${businessId}:`, err);
    return { synced: false, wabaId, error: err?.message || "Sync exception" };
  }
}

/**
 * Returns templates scoped strictly to this business AND its connected WABA.
 * If the business has no WABA connected yet, returns an empty list.
 */
export async function getClientTemplates(
  businessId: string,
  options?: { syncFromMeta?: boolean; approvedOnly?: boolean }
) {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { businessId },
    select: { waBusinessAccountId: true, waToken: true },
  });

  const wabaId = config?.waBusinessAccountId?.trim() || null;
  if (!wabaId) {
    return [];
  }

  const existingCount = await prisma.template.count({
    where: { businessId, wabaId },
  });

  if (options?.syncFromMeta || (existingCount === 0 && Boolean(config?.waToken))) {
    await syncClientTemplatesFromMeta(businessId);
  }

  return prisma.template.findMany({
    where: {
      businessId,
      wabaId,
      name: { not: "hello_world" },
      ...(options?.approvedOnly ? { status: "APPROVED" } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrCreateReusableTemplate(
  businessId: string,
  templateName: string = POSTER_TEMPLATE_NAME
) {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { businessId },
    select: { waBusinessAccountId: true, waToken: true },
  });

  const wabaId = config?.waBusinessAccountId?.trim() || null;
  if (!wabaId) {
    return null;
  }

  const targetName = templateName === TEXT_TEMPLATE_NAME ? TEXT_TEMPLATE_NAME : POSTER_TEMPLATE_NAME;

  await syncClientTemplatesFromMeta(businessId);

  return prisma.template.findFirst({
    where: {
      businessId,
      wabaId,
      name: targetName,
      status: "APPROVED",
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaignTemplates(businessId: string) {
  const approved = await getClientTemplates(businessId, { syncFromMeta: true, approvedOnly: true });
  const posterTemplate = approved.find((t) => t.name === POSTER_TEMPLATE_NAME) || null;
  const textTemplate = approved.find((t) => t.name === TEXT_TEMPLATE_NAME) || approved[0] || null;
  return { posterTemplate, textTemplate, approvedTemplates: approved };
}
