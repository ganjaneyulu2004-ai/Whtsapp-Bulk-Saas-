import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const config = await prisma.whatsAppConfig.findUnique({
      where: { businessId: business.id },
    });
    const optOutCount = await prisma.contact.count({
      where: { businessId: business.id, optedOut: true },
    });
    const optOutContacts = await prisma.contact.findMany({
      where: { businessId: business.id, optedOut: true },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      business,
      whatsappConfig: config,
      optOutCount,
      optOutContacts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();

    const {
      name,
      category,
      phone,
      address,
      perMessageCost,
      language,
      website,
      defaultBookingLink,
      waToken,
      waPhoneNumberId,
      waBusinessAccountId,
      waApiVersion,
      metaAppId,
    } = body;

    // Update business profile
    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: name || business.name,
        category: category || business.category,
        phone: phone !== undefined ? phone : business.phone,
        address: address !== undefined ? address : business.address,
        website: website !== undefined ? website : business.website,
        defaultBookingLink: defaultBookingLink !== undefined ? defaultBookingLink : business.defaultBookingLink,
        perMessageCost: perMessageCost !== undefined ? parseFloat(perMessageCost) : business.perMessageCost,
        language: language || business.language,
      },
    });

    // Update WhatsApp credentials
    const updatedConfig = await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waToken: waToken !== undefined ? waToken : undefined,
        waPhoneNumberId: waPhoneNumberId !== undefined ? waPhoneNumberId : undefined,
        waBusinessAccountId: waBusinessAccountId !== undefined ? waBusinessAccountId : undefined,
        waApiVersion: waApiVersion || "v19.0",
        metaAppId: metaAppId !== undefined ? metaAppId : undefined,
        isConnected: true,
      },
      create: {
        businessId: business.id,
        waToken,
        waPhoneNumberId,
        waBusinessAccountId,
        waApiVersion: waApiVersion || "v19.0",
        metaAppId,
        isConnected: true,
      },
    });

    return NextResponse.json({ business: updatedBusiness, whatsappConfig: updatedConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
