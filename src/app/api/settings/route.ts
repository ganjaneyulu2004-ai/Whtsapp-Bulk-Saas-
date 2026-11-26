import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { encryptToken, decryptToken, maskToken } from "@/lib/encryption";
import { getMetaGraphVersion } from "@/lib/meta-config";
import { fetchWabaOwnerInfo } from "@/lib/whatsapp";
import { getAiAssistantHealth } from "@/lib/ai-assistant";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const config = await prisma.whatsAppConfig.findUnique({
      where: { businessId: business.id },
    });
    const optOutCount = await prisma.contact.count({
      where: { businessId: business.id, optedOut: true, isTest: false },
    });
    const optOutContacts = await prisma.contact.findMany({
      where: { businessId: business.id, optedOut: true, isTest: false },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    const safeConfig = config
      ? {
        ...config,
        waToken: maskToken(config.waToken),
      }
      : null;

    return NextResponse.json({
      business,
      whatsappConfig: safeConfig,
      optOutCount,
      optOutContacts,
      aiStatus: getAiAssistantHealth(),
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
      locationMapLink,
      servicesAndPricing,
      workingHours,
      businessDescription,
      aiBotEnabled,
      aiTone,
      aiCustomInstructions,
      autoBookingEnabled,
      waToken,
      waPhoneNumberId,
      waBusinessAccountId,
      waApiVersion,
      metaAppId,
    } = body;

    // Update business profile
    const updatedBusiness = await (prisma.business as any).update({
      where: { id: business.id },
      data: {
        name: name || business.name,
        category: category || business.category,
        phone: phone !== undefined ? phone : business.phone,
        address: address !== undefined ? address : business.address,
        website: website !== undefined ? website : business.website,
        defaultBookingLink: defaultBookingLink !== undefined ? defaultBookingLink : business.defaultBookingLink,
        locationMapLink: locationMapLink !== undefined ? locationMapLink : (business as any).locationMapLink,
        servicesAndPricing: servicesAndPricing !== undefined ? servicesAndPricing : (business as any).servicesAndPricing,
        workingHours: workingHours !== undefined ? workingHours : (business as any).workingHours,
        businessDescription: businessDescription !== undefined ? businessDescription : (business as any).businessDescription,
        aiBotEnabled: aiBotEnabled !== undefined ? Boolean(aiBotEnabled) : (business as any).aiBotEnabled ?? true,
        aiTone: aiTone !== undefined ? aiTone : (business as any).aiTone || "friendly_respectful",
        aiCustomInstructions: aiCustomInstructions !== undefined ? aiCustomInstructions : (business as any).aiCustomInstructions,
        autoBookingEnabled: autoBookingEnabled !== undefined ? Boolean(autoBookingEnabled) : (business as any).autoBookingEnabled ?? true,
        perMessageCost: perMessageCost !== undefined ? parseFloat(perMessageCost) : business.perMessageCost,
        language: language || business.language,
      },
    });

    // Check existing configuration
    const existingConfig = await prisma.whatsAppConfig.findUnique({
      where: { businessId: business.id },
    });

    // Resolve effective token:
    // If client sent a new plain token (not masked with '...'), use it and encrypt it.
    // If client sent a masked token or omitted it, keep existing encrypted token.
    const isNewTokenProvided = typeof waToken === "string" && waToken.trim() !== "" && !waToken.includes("...");
    const effectivePlainToken = isNewTokenProvided
      ? waToken.trim()
      : decryptToken(existingConfig?.waToken);

    // Fetch WhatsApp details from Meta if token & phoneId provided
    let displayPhoneNumber: string | undefined;
    let verifiedName: string | undefined;
    let qualityRating: string | undefined;

    if (effectivePlainToken && waPhoneNumberId && !effectivePlainToken.startsWith("EAAG...")) {
      try {
        const version = getMetaGraphVersion(waApiVersion);
        const metaRes = await fetch(`https://graph.facebook.com/${version}/${waPhoneNumberId}`, {
          headers: { Authorization: `Bearer ${effectivePlainToken}` },
        });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          displayPhoneNumber = metaData.display_phone_number || undefined;
          verifiedName = metaData.verified_name || undefined;
          qualityRating = metaData.quality_rating || undefined;
        }
      } catch { }
    }

    // Determine encrypted token to write:
    // If new token is provided -> encrypt it.
    // If empty string explicitly passed -> clear it (null).
    // If masked or undefined -> keep existing.
    let tokenToWrite: string | null | undefined = undefined;
    if (isNewTokenProvided) {
      tokenToWrite = encryptToken(effectivePlainToken);
    } else if (waToken === "") {
      tokenToWrite = null;
    }

    const effectiveWabaId = (waBusinessAccountId !== undefined ? waBusinessAccountId : existingConfig?.waBusinessAccountId)?.trim();
    const resolvedPlainToken = isNewTokenProvided ? effectivePlainToken : decryptToken(existingConfig?.waToken);
    const wabaOwner = effectiveWabaId && resolvedPlainToken ? await fetchWabaOwnerInfo(effectiveWabaId, resolvedPlainToken) : null;

    // Update WhatsApp credentials
    const updatedConfig = await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        ...(tokenToWrite !== undefined ? { waToken: tokenToWrite } : {}),
        waPhoneNumberId: waPhoneNumberId !== undefined ? waPhoneNumberId : undefined,
        waBusinessAccountId: waBusinessAccountId !== undefined ? waBusinessAccountId : undefined,
        waApiVersion: getMetaGraphVersion(waApiVersion),
        metaAppId: metaAppId !== undefined ? metaAppId : undefined,
        displayPhoneNumber: displayPhoneNumber || undefined,
        verifiedName: verifiedName || undefined,
        qualityRating: qualityRating || undefined,
        ...(wabaOwner?.ownerBusinessId ? { ownerBusinessId: wabaOwner.ownerBusinessId } : {}),
        ...(wabaOwner?.ownerBusinessName ? { ownerBusinessName: wabaOwner.ownerBusinessName } : {}),
        ...(wabaOwner?.wabaName ? { wabaName: wabaOwner.wabaName } : {}),
        isConnected: !!((tokenToWrite !== undefined ? tokenToWrite : existingConfig?.waToken) && (waPhoneNumberId || existingConfig?.waPhoneNumberId)),
        connectionMethod: "MANUAL",
      },
      create: {
        businessId: business.id,
        waToken: tokenToWrite || null,
        waPhoneNumberId,
        waBusinessAccountId,
        waApiVersion: getMetaGraphVersion(waApiVersion),
        metaAppId,
        displayPhoneNumber,
        verifiedName,
        qualityRating,
        ownerBusinessId: wabaOwner?.ownerBusinessId || null,
        ownerBusinessName: wabaOwner?.ownerBusinessName || null,
        wabaName: wabaOwner?.wabaName || null,
        isConnected: !!(tokenToWrite && waPhoneNumberId),
        connectionMethod: "MANUAL",
      },
    });

    if (wabaOwner?.ownerBusinessId) {
      await prisma.business.update({
        where: { id: business.id },
        data: { ownerBusinessId: wabaOwner.ownerBusinessId },
      }).catch(() => {});
    }

    const safeConfig = {
      ...updatedConfig,
      waToken: maskToken(updatedConfig.waToken),
    };

    return NextResponse.json({ business: updatedBusiness, whatsappConfig: safeConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
