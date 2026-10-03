import { NextResponse } from "next/server";
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
    const business = await getCurrentBusiness();
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

    let finalTemplateId = templateId;
    if (posterImage) {
      // ALWAYS use offer_poster_v1 when a poster is uploaded
      const posterTpl = await prisma.template.create({
        data: {
          businessId: business.id,
          name: "offer_poster_v1",
          category: "MARKETING",
          language: "en_US",
          headerType: "IMAGE",
          headerMediaUrl: posterImage,
          bodyText: "Dear {{1}},\n\nWe have an offer for you: {{2}}\n\nThank you for shopping with {{3}}. Have a great day!",
          footerText: "Reply STOP to unsubscribe",
          metaTemplateId: "1475745637707104",
          status: "APPROVED",
        },
      });
      finalTemplateId = posterTpl.id;
    } else if (!finalTemplateId) {
      // Use offer_update_v1 when no poster is uploaded
      let textTpl = await prisma.template.findFirst({
        where: { businessId: business.id, name: "offer_update_v1" },
        orderBy: { createdAt: "desc" },
      });
      if (!textTpl) {
        textTpl = await prisma.template.create({
          data: {
            businessId: business.id,
            name: "offer_update_v1",
            category: "MARKETING",
            language: "en_US",
            headerType: "TEXT",
            bodyText: "Dear {{1}},\n\nWe have an offer for you: {{2}}\n\nThank you for shopping with {{3}}. Have a great day!",
            footerText: "Reply STOP to unsubscribe",
            metaTemplateId: "1075830035046444",
            status: "APPROVED",
          },
        });
      }
      finalTemplateId = textTpl.id;
    }

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
