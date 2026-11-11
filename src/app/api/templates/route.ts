import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { submitTemplateToMeta } from "@/lib/whatsapp";
import { decryptToken } from "@/lib/encryption";

export async function GET(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const { searchParams } = new URL(req.url);
    const doSync = searchParams.get("sync") === "true";

    const config = business.whatsappConfig;
    const token = decryptToken(config?.waToken);
    const wabaId = config?.waBusinessAccountId;
    const version = config?.waApiVersion || process.env.WA_API_VERSION || "v21.0";

    // If client requested sync and has active Meta connection, sync template approval statuses live from Meta
    if (doSync && token && wabaId) {
      try {
        console.log(`[Templates Sync] Fetching live templates from Meta for WABA ${wabaId}...`);
        const metaUrl = `https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=100`;
        const res = await fetch(metaUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const metaData = await res.json();

        if (res.ok && Array.isArray(metaData?.data)) {
          console.log(`[Templates Sync] Meta returned ${metaData.data.length} templates.`);
          for (const m of metaData.data) {
            const metaStatus = (m.status || "APPROVED").toUpperCase();
            const metaTplId = m.id ? String(m.id) : undefined;
            const tplName = m.name;

            // Check if template exists in DB
            const existing = await prisma.template.findFirst({
              where: {
                businessId: business.id,
                name: tplName,
              },
            });

            if (existing) {
              await prisma.template.update({
                where: { id: existing.id },
                data: {
                  status: metaStatus,
                  metaTemplateId: metaTplId || existing.metaTemplateId,
                  rejectionReason: m.rejected_reason || null,
                },
              });
            } else {
              // Extract body text from components
              const bodyComp = m.components?.find((c: any) => c.type === "BODY");
              const bodyText = bodyComp?.text || `Template synced from Meta: ${tplName}`;

              await prisma.template.create({
                data: {
                  businessId: business.id,
                  name: tplName,
                  category: m.category || "MARKETING",
                  language: m.language || "en_US",
                  headerType: "NONE",
                  bodyText: bodyText,
                  metaTemplateId: metaTplId || `meta_${Date.now()}`,
                  status: metaStatus,
                  rejectionReason: m.rejected_reason || null,
                },
              });
            }
          }
        } else {
          console.warn("[Templates Sync] Meta API error response:", metaData);
        }
      } catch (syncErr) {
        console.error("[Templates Sync] Exception during sync:", syncErr);
      }
    }

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
        waToken: decryptToken(business.whatsappConfig?.waToken) || undefined,
        waBusinessAccountId: business.whatsappConfig?.waBusinessAccountId || undefined,
        waApiVersion: business.whatsappConfig?.waApiVersion || undefined,
      },
      {
        name: cleanName,
        category: category || "MARKETING",
        language: language || "en_US",
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
        language: language || "en_US",
        headerType: headerType || "NONE",
        headerMediaUrl,
        bodyText,
        footerText,
        buttonsJson: buttons ? JSON.stringify(buttons) : null,
        metaTemplateId: metaRes.metaTemplateId || `meta_${Date.now()}`,
        status: metaRes.status || "APPROVED",
        rejectionReason: metaRes.error || null,
      },
    });

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
