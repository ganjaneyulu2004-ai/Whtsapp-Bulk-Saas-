import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";
import { submitTemplateToMeta } from "@/lib/whatsapp";
import { decryptToken } from "@/lib/encryption";
import { getClientTemplates } from "@/lib/template-service";

export async function GET(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ error: "Business account not found" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const doSync = searchParams.get("sync") === "true";
    const approvedOnly = searchParams.get("approvedOnly") === "true";

    const templates = await getClientTemplates(business.id, {
      syncFromMeta: doSync,
      approvedOnly,
    });

    return NextResponse.json(templates);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ error: "Business account not found" }, { status: 403 });
    }

    const wabaId = business.whatsappConfig?.waBusinessAccountId?.trim() || null;
    const token = decryptToken(business.whatsappConfig?.waToken);

    if (!wabaId || !token) {
      return NextResponse.json(
        {
          error:
            "No connected WhatsApp Business Account found for your account. Please connect WhatsApp first.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, category, language, headerType, headerMediaUrl, bodyText, footerText, buttons } = body;

    if (!name || !bodyText) {
      return NextResponse.json({ error: "Template name and body text are required" }, { status: 400 });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const cleanLang = (language || "en_US").trim();

    // Submit directly to this client's own WABA via Meta WhatsApp Graph API
    const metaRes = await submitTemplateToMeta(
      {
        waToken: token,
        waBusinessAccountId: wabaId,
        waApiVersion: business.whatsappConfig?.waApiVersion || undefined,
      },
      {
        name: cleanName,
        category: category || "MARKETING",
        language: cleanLang,
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

    const existing = await prisma.template.findFirst({
      where: {
        businessId: business.id,
        wabaId,
        name: cleanName,
        language: cleanLang,
      },
    });

    const tplData = {
      businessId: business.id,
      wabaId,
      name: cleanName,
      category: category || "MARKETING",
      language: cleanLang,
      headerType: headerType || "NONE",
      headerMediaUrl,
      bodyText,
      footerText,
      buttonsJson: buttons ? JSON.stringify(buttons) : null,
      metaTemplateId: metaRes.metaTemplateId || `meta_${Date.now()}`,
      status: metaRes.success ? metaRes.status || "PENDING" : "REJECTED",
      rejectionReason: metaRes.error || null,
    };

    const template = existing
      ? await prisma.template.update({ where: { id: existing.id }, data: tplData })
      : await prisma.template.create({ data: tplData });

    if (!metaRes.success && metaRes.error) {
      return NextResponse.json(
        {
          template,
          error: `Meta Template Submission Error: ${metaRes.error}`,
          success: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
      message: `Template "${cleanName}" submitted to Meta successfully! Status: ${template.status}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create template" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ error: "Business account not found" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let templateId = searchParams.get("id");
    if (!templateId) {
      const body = await req.json().catch(() => ({}));
      templateId = body?.id ? String(body.id) : null;
    }

    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required." }, { status: 400 });
    }

    // Strictly scope lookup to this business's own row
    const existing = await prisma.template.findFirst({
      where: {
        id: templateId,
        businessId: business.id,
      },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found for your account." }, { status: 404 });
    }

    const usedInCampaigns = await prisma.campaign.count({
      where: {
        templateId: existing.id,
        businessId: business.id,
      },
    });

    if (usedInCampaigns > 0) {
      return NextResponse.json(
        {
          error: `Cannot remove "${existing.name}" because it is referenced by ${usedInCampaigns} past campaign(s).`,
        },
        { status: 409 }
      );
    }

    await prisma.template.deleteMany({
      where: {
        id: existing.id,
        businessId: business.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to remove template" }, { status: 500 });
  }
}
