import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";
import { submitTemplateToMeta, uploadMediaToMetaResumable } from "@/lib/whatsapp";
import { decryptToken } from "@/lib/encryption";
import { countTemplateBodyVariables, getClientTemplates } from "@/lib/template-service";
import { MAX_TEMPLATE_IMAGE_BYTES, saveTemplateImageBuffer } from "@/lib/media-storage";

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

    const contentType = req.headers.get("content-type") || "";
    let name = "";
    let category = "MARKETING";
    let language = "en_US";
    let headerType = "NONE";
    let bodyText = "";
    let footerText = "";
    let buttons: any = null;
    let uploadedImageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name = String(formData.get("name") || "");
      category = String(formData.get("category") || "MARKETING").toUpperCase();
      language = String(formData.get("language") || "en_US");
      headerType = String(formData.get("headerType") || "NONE").toUpperCase();
      bodyText = String(formData.get("bodyText") || "");
      footerText = String(formData.get("footerText") || "");
      const rawButtons = formData.get("buttons");
      if (rawButtons && typeof rawButtons === "string") {
        try {
          buttons = JSON.parse(rawButtons);
        } catch {}
      }
      const maybeFile = formData.get("headerImage");
      if (maybeFile && typeof maybeFile === "object" && "arrayBuffer" in maybeFile) {
        uploadedImageFile = maybeFile as File;
      }
    } else {
      const body = await req.json();
      name = String(body?.name || "");
      category = String(body?.category || "MARKETING").toUpperCase();
      language = String(body?.language || "en_US");
      headerType = String(body?.headerType || "NONE").toUpperCase();
      bodyText = String(body?.bodyText || "");
      footerText = String(body?.footerText || "");
      buttons = body?.buttons || null;
    }

    if (!name.trim() || !bodyText.trim()) {
      return NextResponse.json({ error: "Template name and body text are required" }, { status: 400 });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (cleanName === "hello_world") {
      return NextResponse.json(
        { error: "Cannot create 'hello_world' — choose a custom template name." },
        { status: 400 }
      );
    }

    const cleanCategory: "MARKETING" | "UTILITY" =
      category === "UTILITY" ? "UTILITY" : "MARKETING";
    const cleanHeaderType = headerType === "IMAGE" ? "IMAGE" : "NONE";
    const cleanLang = (language || "en_US").trim();

    let savedHeaderImageUrl: string | null = null;
    let metaHeaderHandle: string | null = null;

    if (cleanHeaderType === "IMAGE") {
      if (!uploadedImageFile || uploadedImageFile.size === 0) {
        return NextResponse.json(
          { error: "Please upload a JPG or PNG image (max 5 MB) for an Image header template." },
          { status: 400 }
        );
      }

      if (uploadedImageFile.size > MAX_TEMPLATE_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Template header image must be 5 MB or smaller." },
          { status: 400 }
        );
      }

      const fileMime = String(uploadedImageFile.type || "").toLowerCase();
      if (!["image/jpeg", "image/jpg", "image/png"].includes(fileMime)) {
        return NextResponse.json(
          { error: "Only JPG and PNG images are allowed." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await uploadedImageFile.arrayBuffer());
      const reqOrigin = new URL(req.url).origin;
      const stored = await saveTemplateImageBuffer(buffer, fileMime, business.id, reqOrigin);
      savedHeaderImageUrl = stored.publicUrl;

      // Upload binary to Meta Resumable Upload API with this business's own token
      const resumableRes = await uploadMediaToMetaResumable(
        {
          waToken: token,
          metaAppId: business.whatsappConfig?.metaAppId || undefined,
          waApiVersion: business.whatsappConfig?.waApiVersion || undefined,
        },
        buffer,
        uploadedImageFile.name || stored.filename,
        fileMime
      );

      if (!resumableRes.success || !resumableRes.headerHandle) {
        return NextResponse.json(
          {
            error: `Meta Resumable Upload Error: ${resumableRes.error || "Failed to obtain header_handle"}`,
            success: false,
          },
          { status: 400 }
        );
      }

      metaHeaderHandle = resumableRes.headerHandle;
    }

    const bodyVarCount = countTemplateBodyVariables(bodyText);
    const sampleBodyVars =
      bodyVarCount > 0
        ? [Array.from({ length: bodyVarCount }, (_, idx) => `SampleValue${idx + 1}`)]
        : undefined;

    // Submit directly to this client's own WABA via Meta WhatsApp Graph API
    const metaRes = await submitTemplateToMeta(
      {
        waToken: token,
        waBusinessAccountId: wabaId,
        waApiVersion: business.whatsappConfig?.waApiVersion || undefined,
      },
      {
        name: cleanName,
        category: cleanCategory,
        language: cleanLang,
        components: [
          ...(cleanHeaderType === "IMAGE" && metaHeaderHandle
            ? [
                {
                  type: "HEADER" as const,
                  format: "IMAGE" as const,
                  example: {
                    header_handle: [metaHeaderHandle],
                  },
                },
              ]
            : []),
          {
            type: "BODY" as const,
            text: bodyText.trim(),
            ...(sampleBodyVars ? { example: { body_text: sampleBodyVars } } : {}),
          },
          ...(footerText.trim()
            ? [
                {
                  type: "FOOTER" as const,
                  text: footerText.trim(),
                },
              ]
            : []),
          ...(Array.isArray(buttons) && buttons.length > 0
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
      category: cleanCategory,
      language: cleanLang,
      headerType: cleanHeaderType,
      headerImageUrl: savedHeaderImageUrl,
      headerMediaUrl: savedHeaderImageUrl,
      headerHandle: metaHeaderHandle,
      bodyText: bodyText.trim(),
      footerText: footerText.trim() || null,
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
