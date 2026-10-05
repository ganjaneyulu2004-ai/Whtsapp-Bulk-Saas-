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

    // Fetch WhatsApp details from Meta if token & phoneId provided
    let displayPhoneNumber: string | undefined;
    let verifiedName: string | undefined;
    let qualityRating: string | undefined;

    if (waToken && waPhoneNumberId && !waToken.startsWith("EAAG...")) {
      try {
        const version = waApiVersion || "v26.0";
        const metaRes = await fetch(`https://graph.facebook.com/${version}/${waPhoneNumberId}`, {
          headers: { Authorization: `Bearer ${waToken}` },
        });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          displayPhoneNumber = metaData.display_phone_number || undefined;
          verifiedName = metaData.verified_name || undefined;
          qualityRating = metaData.quality_rating || undefined;
        }
      } catch {}
    }

    // Update WhatsApp credentials
    const updatedConfig = await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waToken: waToken !== undefined ? waToken : undefined,
        waPhoneNumberId: waPhoneNumberId !== undefined ? waPhoneNumberId : undefined,
        waBusinessAccountId: waBusinessAccountId !== undefined ? waBusinessAccountId : undefined,
        waApiVersion: waApiVersion || "v26.0",
        metaAppId: metaAppId !== undefined ? metaAppId : undefined,
        displayPhoneNumber: displayPhoneNumber || undefined,
        verifiedName: verifiedName || undefined,
        qualityRating: qualityRating || undefined,
        isConnected: !!(waToken && waPhoneNumberId),
        connectionMethod: "MANUAL",
      },
      create: {
        businessId: business.id,
        waToken,
        waPhoneNumberId,
        waBusinessAccountId,
        waApiVersion: waApiVersion || "v26.0",
        metaAppId,
        displayPhoneNumber,
        verifiedName,
        qualityRating,
        isConnected: !!(waToken && waPhoneNumberId),
        connectionMethod: "MANUAL",
      },
    });

    return NextResponse.json({ business: updatedBusiness, whatsappConfig: updatedConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
