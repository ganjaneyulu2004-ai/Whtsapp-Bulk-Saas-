import { NextResponse } from "next/server";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";
import { decryptToken } from "@/lib/encryption";
import { getMetaGraphVersion } from "@/lib/meta-config";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { countTemplateBodyVariables, getClientTemplates } from "@/lib/template-service";
import { saveBase64TemplateImage } from "@/lib/media-storage";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    const body = await req.json();
    const {
      recipientPhone,
      phone,
      recipientName,
      offerText,
      businessName,
      templateName,
      languageCode,
      headerImageUrl,
      posterImage,
      customBodyParameters,
    } = body;

    let rawPhone = String(recipientPhone || phone || "").replace(/[^0-9]/g, "");
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = "91" + rawPhone.slice(1);
    }

    if (!rawPhone || rawPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Valid recipient phone number is required." },
        { status: 400 }
      );
    }

    const targetPhone = rawPhone;

    // 1. Unauthenticated public landing demo: allow ONLY direct text demo ping without touching any client WABA
    if (!session?.user?.id) {
      if (templateName) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }

      const demoToken = process.env.WA_TOKEN;
      const demoPhoneId = process.env.WA_PHONE_NUMBER_ID;
      if (!demoToken || !demoPhoneId) {
        return NextResponse.json(
          { success: false, error: "Demo WhatsApp channel is currently unavailable. Please log in to send tests." },
          { status: 400 }
        );
      }

      const demoResult = await sendWhatsAppTemplateMessage(
        {
          waToken: demoToken,
          waPhoneNumberId: demoPhoneId,
          waApiVersion: getMetaGraphVersion(),
        },
        targetPhone,
        recipientName || "Customer",
        "direct_message",
        "en",
        undefined,
        {
          is24HourWindow: true,
          offerText: offerText || "Hello from OneAmple! This is a live WhatsApp Cloud API demo test.",
          businessName: businessName || "OneAmple",
          allowPlatformFallback: false,
        }
      );

      if (demoResult.success) {
        return NextResponse.json({
          success: true,
          message: `Real Meta test message sent successfully to +${targetPhone}!`,
          waMessageId: demoResult.waMessageId,
          recipient: targetPhone,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            demoResult.errorCode === "131047"
              ? "24-hour window closed on demo number. Please log in with your own WhatsApp Business Account to test approved templates."
              : `Meta Error (${demoResult.errorCode || "400"}): ${demoResult.errorMessage || "Failed"}`,
        },
        { status: 400 }
      );
    }

    // 2. Authenticated client: strictly use ONLY this business's connected WhatsAppConfig & WABA templates
    const business = await getCurrentBusiness();
    const config: any = business.whatsappConfig || {};
    const token = decryptToken(config.waToken);
    const phoneId = config.waPhoneNumberId?.trim();
    const wabaId = config.waBusinessAccountId?.trim();
    const apiVersion = getMetaGraphVersion(config.waApiVersion);

    if (!token || !phoneId || !wabaId) {
      return NextResponse.json(
        {
          success: false,
          error: "No WhatsApp Business number connected for your account. Please connect your number first.",
        },
        { status: 400 }
      );
    }

    const bName = (businessName || business.name || "OneAmple").trim();
    const messageContent = (
      offerText ||
      `Live Test Message from ${bName} via OneAmple! Your WhatsApp Cloud API channel is active.`
    ).trim();

    if (templateName) {
      if (templateName === "hello_world") {
        return NextResponse.json(
          {
            success: false,
            error: "The sample 'hello_world' template is only supported on Meta public test numbers. Please select an APPROVED template from your own WhatsApp Business Account.",
          },
          { status: 400 }
        );
      }

      // Always verify template exists and is APPROVED in THIS client's own WABA and use its exact language
      const approvedTemplates = await getClientTemplates(business.id, {
        syncFromMeta: true,
        approvedOnly: true,
      });

      if (approvedTemplates.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Your connected WhatsApp Business Account has no APPROVED templates yet. Create a template in the Templates tab and wait for Meta approval, or use Custom Text within a 24-hour window.",
          },
          { status: 400 }
        );
      }

      const matched =
        approvedTemplates.find(
          (t) => t.name === templateName && (!languageCode || t.language === languageCode)
        ) || approvedTemplates.find((t) => t.name === templateName);

      if (!matched) {
        return NextResponse.json(
          {
            success: false,
            error: `Template "${templateName}" was not found as APPROVED in your connected WABA (${wabaId}). Sync live templates and choose an APPROVED template belonging to your own account.`,
          },
          { status: 400 }
        );
      }

      let effectiveHeaderImage: string | undefined = undefined;
      if (matched.headerType === "IMAGE") {
        if (posterImage && String(posterImage).startsWith("data:image/")) {
          const saved = await saveBase64TemplateImage(
            String(posterImage),
            business.id,
            new URL(req.url).origin
          );
          effectiveHeaderImage = saved.publicUrl;
        } else {
          effectiveHeaderImage =
            (headerImageUrl && String(headerImageUrl).trim()) ||
            matched.headerImageUrl ||
            matched.headerMediaUrl ||
            undefined;
        }

        if (!effectiveHeaderImage) {
          return NextResponse.json(
            {
              success: false,
              error: `Template "${matched.name}" requires an IMAGE header, but no image URL is attached yet.`,
            },
            { status: 400 }
          );
        }
      }

      const bodyVarCount = countTemplateBodyVariables(matched.bodyText);
      const resolvedCustomVars = Array.isArray(customBodyParameters)
        ? customBodyParameters.map((v: any) =>
            v === "__CONTACT_NAME__" ? recipientName || "Customer" : String(v || "")
          )
        : undefined;

      const sendRes = await sendWhatsAppTemplateMessage(
        {
          waToken: token,
          waPhoneNumberId: phoneId,
          waApiVersion: apiVersion,
        },
        targetPhone,
        recipientName || "Customer",
        matched.name,
        matched.language,
        effectiveHeaderImage,
        {
          offerText: messageContent,
          businessName: bName,
          is24HourWindow: false,
          bodyVarCount,
          customBodyParameters: resolvedCustomVars,
          headerType: matched.headerType,
          headerText: matched.headerText || undefined,
        }
      );

      if (sendRes.success) {
        return NextResponse.json({
          success: true,
          message: `Test template "${matched.name}" (${matched.language}) sent successfully to +${targetPhone}!`,
          waMessageId: sendRes.waMessageId,
          metaStatus: "sent",
          recipient: targetPhone,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Meta Error (${sendRes.errorCode || "400"}): ${sendRes.errorMessage || "Meta API error"}`,
        },
        { status: 400 }
      );
    }

    // Direct 24-hour free-form text test message (NO hello_world fallback)
    const directRes = await sendWhatsAppTemplateMessage(
      {
        waToken: token,
        waPhoneNumberId: phoneId,
        waApiVersion: apiVersion,
      },
      targetPhone,
      recipientName || "Customer",
      "direct_message",
      "en",
      undefined,
      {
        is24HourWindow: true,
        freeFormText: messageContent,
        businessName: bName,
      }
    );

    if (directRes.success) {
      return NextResponse.json({
        success: true,
        message: `Real Meta test message sent successfully to +${targetPhone}!`,
        waMessageId: directRes.waMessageId,
        metaStatus: "sent",
        recipient: targetPhone,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          directRes.errorCode === "131047"
            ? "24-hour customer service window is closed for this recipient. Select one of your APPROVED templates from the dropdown to send a template test."
            : `Meta Error (${directRes.errorCode || "400"}): ${directRes.errorMessage || "Meta API error"}`,
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[Send Test Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error while sending test",
      },
      { status: 500 }
    );
  }
}
