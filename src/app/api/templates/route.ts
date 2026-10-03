import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { submitTemplateToMeta } from "@/lib/whatsapp";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const templates = await prisma.template.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();

    const { name, category, language, headerType, headerMediaUrl, bodyText, footerText, buttons } = body;

    if (!name || !bodyText) {
      return NextResponse.json({ error: "Template name and body text are required" }, { status: 400 });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Submit to Meta WhatsApp Graph API
    const metaRes = await submitTemplateToMeta(
      {
        waToken: business.whatsappConfig?.waToken || undefined,
        waBusinessAccountId: business.whatsappConfig?.waBusinessAccountId || undefined,
        waApiVersion: business.whatsappConfig?.waApiVersion || undefined,
      },
      {
        name: cleanName,
        category: category || "MARKETING",
        language: language || "en",
        components: [
          ...(headerType === "IMAGE"
            ? [
                {
                  type: "HEADER" as const,
                  format: "IMAGE" as const,
                },
              ]
            : []),
          {
            type: "BODY" as const,
            text: bodyText,
          },
          ...(footerText
            ? [
                {
                  type: "FOOTER" as const,
                  text: footerText,
                },
              ]
            : []),
          ...(buttons && buttons.length > 0
            ? [
                {
                  type: "BUTTONS" as const,
                  buttons: buttons.map((b: any) => ({
                    type: b.type,
                    text: b.text,
                    phone_number: b.type === "PHONE_NUMBER" ? b.value : undefined,
                    url: b.type === "URL" ? b.value : undefined,
                  })),
                },
              ]
            : []),
        ],
      }
    );

    const template = await prisma.template.create({
      data: {
        businessId: business.id,
        name: cleanName,
        category: category || "MARKETING",
        language: language || "en",
        headerType: headerType || "IMAGE",
        headerMediaUrl,
        bodyText,
        footerText,
        buttonsJson: buttons ? JSON.stringify(buttons) : null,
        metaTemplateId: metaRes.metaTemplateId || `meta_${Date.now()}`,
        status: metaRes.status || "APPROVED",
        rejectionReason: metaRes.error || null,
      },
    });

    return NextResponse.json(template);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
