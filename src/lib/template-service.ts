import { prisma } from "./prisma";

export const POSTER_TEMPLATE_NAME = "offer_poster_v1";
export const TEXT_TEMPLATE_NAME = "offer_update_v1";
export const REUSABLE_TEMPLATE_NAME = "offer_update_v1";

export async function getOrCreateReusableTemplate(businessId: string, templateName: string = POSTER_TEMPLATE_NAME) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { whatsappConfig: true },
  });

  if (!business) throw new Error("Business not found");

  const targetName = templateName === "offer_update_v1" ? TEXT_TEMPLATE_NAME : POSTER_TEMPLATE_NAME;
  const isPoster = targetName === POSTER_TEMPLATE_NAME;

  // Check if template exists in local DB
  let template = await prisma.template.findFirst({
    where: {
      businessId,
      name: targetName,
    },
    orderBy: { createdAt: "desc" },
  });

  if (template) {
    // Sync live status from Meta API if needed
    try {
      const token = business.whatsappConfig?.waToken || process.env.WA_TOKEN;
      const wabaId = business.whatsappConfig?.waBusinessAccountId || process.env.WA_BUSINESS_ACCOUNT_ID;
      const version = process.env.WA_API_VERSION || business.whatsappConfig?.waApiVersion || "v26.0";

      if (token && wabaId) {
        const res = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates?name=${targetName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const liveTpl = data.data?.[0];
        if (liveTpl && liveTpl.status !== template.status) {
          template = await prisma.template.update({
            where: { id: template.id },
            data: {
              status: liveTpl.status,
              metaTemplateId: liveTpl.id || template.metaTemplateId,
            },
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync template status from Meta:", e);
    }
    return template;
  }

  // Create local template record if not present
  const bodyText = "Dear {{1}},\n\nWe have an offer for you: {{2}}\n\nThank you for shopping with {{3}}. Have a great day!";
  const footerText = "Reply STOP to unsubscribe";

  template = await prisma.template.create({
    data: {
      businessId,
      name: targetName,
      category: "MARKETING",
      language: "en_US",
      headerType: isPoster ? "IMAGE" : "TEXT",
      bodyText,
      footerText,
      metaTemplateId: isPoster ? "1475745637707104" : "1075830035046444",
      status: "APPROVED",
    },
  });

  return template;
}

export async function getCampaignTemplates(businessId: string) {
  const posterTemplate = await getOrCreateReusableTemplate(businessId, POSTER_TEMPLATE_NAME);
  const textTemplate = await getOrCreateReusableTemplate(businessId, TEXT_TEMPLATE_NAME);
  return { posterTemplate, textTemplate };
}
