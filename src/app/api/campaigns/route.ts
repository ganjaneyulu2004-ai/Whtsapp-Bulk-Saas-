import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { processCampaignSending } from "@/lib/queue";

export async function GET(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const where: any = { businessId: business.id };
    if (search) {
      where.name = { contains: search };
    }
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        template: true,
        contactList: true,
        messageLogs: {
          where: { status: "FAILED" },
          select: {
            id: true,
            phone: true,
            recipientName: true,
            errorCode: true,
            errorMessage: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 25,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business: any = await getCurrentBusiness();

    if (session.user.role !== "ADMIN") {
      const sub = await prisma.subscription.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (!sub || sub.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Payment required. Active subscription needed to launch campaigns." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();

    const {
      name,
      businessName,
      bookingLink,
      alwaysUseTemplate,
      type,
      customType,
      note,
      templateId,
      posterImage,
      headerImageUrl,
      bodyVariables,
      contactListId,
      scheduledAt,
      contactsData,
      status: requestedStatus,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }

    if (bookingLink && bookingLink.trim() !== "" && !bookingLink.trim().startsWith("https://")) {
      return NextResponse.json({ error: "Booking link must be a valid https:// URL" }, { status: 400 });
    }

    const clientWabaId = business.whatsappConfig?.waBusinessAccountId?.trim() || null;
    if (!clientWabaId || !business.whatsappConfig?.waToken) {
      return NextResponse.json(
        { error: "Please connect your WhatsApp Business Account before creating a campaign." },
        { status: 400 }
      );
    }

    const { syncClientTemplatesFromMeta, getClientTemplates } = await import("@/lib/template-service");
    await syncClientTemplatesFromMeta(business.id);

    let selectedTemplate: any = null;
    let finalTemplateId = templateId;
    if (finalTemplateId) {
      const ownedTemplate = await prisma.template.findFirst({
        where: {
          id: finalTemplateId,
          businessId: business.id,
          wabaId: clientWabaId,
          name: { not: "hello_world" },
        },
      });
      if (!ownedTemplate) {
        return NextResponse.json(
          { error: "Selected template does not belong to your connected WhatsApp Business Account." },
          { status: 400 }
        );
      }
      selectedTemplate = ownedTemplate;
    } else {
      const approved = await getClientTemplates(business.id, { syncFromMeta: false, approvedOnly: true });
      const fallbackTpl = approved[0];
      if (!fallbackTpl) {
        return NextResponse.json(
          { error: "No APPROVED template found in your connected WhatsApp Business Account. Create and approve a template first." },
          { status: 400 }
        );
      }
      selectedTemplate = fallbackTpl;
      finalTemplateId = fallbackTpl.id;
    }

    // Block launch unless the selected template is live-APPROVED in Meta
    if (String(selectedTemplate.status || "").toUpperCase() !== "APPROVED") {
      return NextResponse.json(
        {
          error: `Campaign launch blocked: template "${selectedTemplate.name}" is currently "${selectedTemplate.status}" and must be APPROVED in Meta before launching.`,
        },
        { status: 400 }
      );
    }

    // Per-campaign IMAGE header URL (only when template has headerType === "IMAGE")
    let campaignHeaderImageUrl: string | null = null;
    if (selectedTemplate?.headerType === "IMAGE") {
      if (posterImage && String(posterImage).startsWith("data:image/")) {
        const { saveBase64TemplateImage } = await import("@/lib/media-storage");
        const stored = await saveBase64TemplateImage(
          String(posterImage),
          business.id,
          new URL(req.url).origin
        );
        campaignHeaderImageUrl = stored.publicUrl;
      } else if (headerImageUrl && String(headerImageUrl).trim() !== "") {
        campaignHeaderImageUrl = String(headerImageUrl).trim();
      } else {
        campaignHeaderImageUrl =
          selectedTemplate.headerImageUrl || selectedTemplate.headerMediaUrl || null;
      }
    }

    const { countTemplateBodyVariables } = await import("@/lib/template-service");
    const { getGenericFallbackForVariable } = await import("@/lib/template-variables");
    const expectedVarCount = countTemplateBodyVariables(selectedTemplate.bodyText);
    let normalizedBodyVariables: string[] | null = null;

    if (expectedVarCount > 0) {
      const incomingList = Array.isArray(bodyVariables) ? bodyVariables : [];
      const used = new Set<string>();
      for (const item of incomingList) {
        if (item && String(item).trim() && String(item).trim() !== "__CONTACT_NAME__") {
          used.add(String(item).trim().toLowerCase());
        }
      }
      normalizedBodyVariables = Array.from({ length: expectedVarCount }, (_, idx) => {
        const num = idx + 1;
        const raw = incomingList[idx];
        if (num === 1 && (raw === "__CONTACT_NAME__" || !raw || String(raw).trim() === "")) {
          return "__CONTACT_NAME__";
        }
        const val = raw ? String(raw).trim() : "";
        if (val) return val;
        // Auto-fill fallback so server never blocks launch
        const fallback = getGenericFallbackForVariable(
          num,
          selectedTemplate.bodyText,
          undefined,
          {
            name: businessName?.trim() || business.name,
            bookingLink: bookingLink?.trim(),
            servicesAndPricing: business.servicesAndPricing,
            businessDescription: business.businessDescription,
            category: business.category,
          },
          used
        );
        used.add(fallback.toLowerCase());
        return fallback;
      });
    }

    const serializedBodyVariables =
      normalizedBodyVariables && normalizedBodyVariables.length > 0
        ? JSON.stringify(normalizedBodyVariables)
        : null;

    let targetContactListId = contactListId;
    let targetContacts: any[] = [];

    if (targetContactListId) {
      targetContacts = await prisma.contact.findMany({
        where: { listId: targetContactListId, businessId: business.id, optedOut: false },
      });
    } else if (contactsData && Array.isArray(contactsData)) {
      const newList = await prisma.contactList.create({
        data: {
          businessId: business.id,
          name: `${name} List`,
          description: `Auto-created for ${name}`,
          contactCount: contactsData.length,
        },
      });
      targetContactListId = newList.id;

      for (const c of contactsData) {
        if (!c.cleanPhone || !c.isValid) continue;
        const contact = await prisma.contact.upsert({
          where: {
            businessId_phone: {
              businessId: business.id,
              phone: c.cleanPhone,
            },
          },
          update: { name: c.name || "Customer", listId: newList.id },
          create: { businessId: business.id, listId: newList.id, name: c.name || "Customer", phone: c.cleanPhone },
        });
        targetContacts.push(contact);
      }
    }

    const initialStatus = requestedStatus || (scheduledAt ? "SCHEDULED" : "SENDING");

    const campaign = await prisma.campaign.create({
      data: {
        businessId: business.id,
        name,
        businessName: businessName?.trim() || business.name || "iBrainLabs",
        bookingLink: bookingLink?.trim() || null,
        alwaysUseTemplate: alwaysUseTemplate !== false,
        type: type || "OFFER",
        customType,
        note,
        headerImageUrl: campaignHeaderImageUrl,
        bodyVariablesJson: serializedBodyVariables,
        templateId: finalTemplateId,
        contactListId: targetContactListId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: initialStatus,
        totalRecipients: targetContacts.length,
      },
    });

    for (const c of targetContacts) {
      await prisma.messageLog.create({
        data: {
          campaignId: campaign.id,
          contactId: c.id,
          phone: c.phone,
          recipientName: c.name || "Customer",
          status: "PENDING",
        },
      });
    }

    // Trigger background queue ONLY if initialStatus is SENDING
    if (initialStatus === "SENDING") {
      processCampaignSending(campaign.id).catch((e) => console.error(e));
    }

    return NextResponse.json(campaign);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
